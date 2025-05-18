import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Button, Card, Badge } from '@radix-ui/themes';
import { 
  Play, 
  Square, 
  Settings, 
  Copy, 
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useStreamStore } from '../stores/streamStore';
import { Stream, StreamStatus } from '../types/stream';
import { startStream, endStream } from '../lib/sui';
import { RTMP_CONFIG } from '../constants/contracts';
import { formatSuiAmount } from '../lib/sui';
import { toast } from 'react-hot-toast';
import { rtmpChecker, RTMPConnectionStatus } from '../utils/rtmpChecker';

const StreamDashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const { streams, updateStream, chatMessages } = useStreamStore();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const streamKey = searchParams.get('key');
  const [stream, setStream] = useState<Stream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<RTMPConnectionStatus>({ isConnected: false });
  const [streamStats, setStreamStats] = useState({
    bitrate: 0,
    fps: 0,
    resolution: '1920x1080',
    uptime: 0
  });

  useEffect(() => {
    if (!currentAccount) {
      navigate('/');
      return;
    }

    if (!streamKey) {
      toast.error('Invalid stream key');
      navigate('/create');
      return;
    }

    console.log('🔍 Looking for stream with key:', streamKey);
    console.log('📊 Available streams:', streams);
    console.log('🔑 Stream keys in store:', streams.map(s => s.streamKey));

    // Find the stream by key
    const foundStream = streams.find(s => s.streamKey === streamKey);
    if (foundStream) {
      console.log('✅ Found stream:', foundStream);
      setStream(foundStream);
      setIsLoading(false);
    } else {
      console.log('❌ Stream not found for key:', streamKey);
      console.log('📋 Available stream keys:', streams.map(s => s.streamKey));
      
      // Give it a moment for the store to update, then try again
      setTimeout(() => {
        const retryFoundStream = streams.find(s => s.streamKey === streamKey);
        if (retryFoundStream) {
          console.log('✅ Found stream on retry:', retryFoundStream);
          setStream(retryFoundStream);
          setIsLoading(false);
        } else {
          console.log('❌ Stream still not found after retry');
          setIsLoading(false);
          toast.error('Stream not found - redirecting to create page');
          navigate('/create');
        }
      }, 1000);
    }
  }, [streamKey, streams, currentAccount, navigate]);

  useEffect(() => {
    // Real RTMP connection status check
    const checkRtmpConnection = async () => {
      if (!streamKey) return;
      
      try {
        const status = await rtmpChecker.checkConnection(streamKey);
        setConnectionStatus(status);
        
        if (status.isConnected) {
          const newStats = {
            bitrate: typeof status.bitrate === 'number' ? status.bitrate : 0,
            fps: typeof status.fps === 'number' ? status.fps : 30,
            resolution: typeof status.resolution === 'string' ? status.resolution : '1920x1080',
            uptime: typeof status.uptime === 'number' ? status.uptime : 0
          };
          setStreamStats(newStats);
        }
      } catch (error) {
        console.error('Error checking RTMP connection:', error);
        setConnectionStatus({ isConnected: false });
      }
    };

    // Check immediately
    checkRtmpConnection();
    
    // Then check every 3 seconds
    const interval = setInterval(checkRtmpConnection, 3000);
    return () => clearInterval(interval);
  }, [streamKey]);

  useEffect(() => {
    // Update stream uptime if live
    if (stream?.status === StreamStatus.LIVE) {
      const interval = setInterval(() => {
        const uptime = Math.floor((Date.now() - stream.startedAt) / 1000);
        setStreamStats(prev => ({ ...prev, uptime }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stream]);

  const handleStartStream = async () => {
    if (!stream || !currentAccount) return;

    if (!connectionStatus.serverRunning) {
      toast.error('RTMP server is not running. Please start the RTMP server first.');
      return;
    }

    if (!connectionStatus.isConnected) {
      toast.error('Please connect OBS to the RTMP server first before going live');
      return;
    }

    console.log('🚀 Starting stream with ID:', stream.id);
    console.log('📊 Stream object:', stream);
    console.log('👤 Current account:', currentAccount.address);

    // Validate stream ID format before proceeding
    const isValidObjectId = /^0x[a-fA-F0-9]{64}$/.test(stream.id);
    if (!isValidObjectId) {
      console.error('❌ Invalid stream ID format:', stream.id);
      toast.error('Invalid stream ID format. Please create a new stream.');
      return;
    }

    setIsStarting(true);
    try {
      // Create HLS manifest on Walrus
      const manifestBlobId = `manifest_${Date.now()}`;
      console.log('📄 Created manifest blob ID:', manifestBlobId);
      
      console.log('🔗 Calling startStream function...');
      const tx = await startStream(stream.id, manifestBlobId);
      console.log('📝 Transaction created:', tx);

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: tx },
          {
            onSuccess: (result) => {
              console.log('✅ Stream started on blockchain:', result);
              console.log('📊 Transaction result details:', JSON.stringify(result, null, 2));
              
              // Update local stream status
              const updatedStream = {
                ...stream,
                status: StreamStatus.LIVE,
                startedAt: Date.now(),
                hlsManifestWalrusId: manifestBlobId
              };

              console.log('🔄 Updated stream object:', updatedStream);
              
              updateStream(stream.id, updatedStream);
              setStream(updatedStream);
              
              toast.success('🎉 You are now LIVE!');
              resolve(result);
            },
            onError: (error) => {
              console.error('❌ Failed to start stream:', error);
              console.error('🔍 Error details:', JSON.stringify(error, null, 2));
              
              // Provide more specific error messages
              if (error.message && error.message.includes('Invalid input')) {
                toast.error('Invalid stream data. Please create a new stream.');
              } else if (error.message && error.message.includes('ValiError')) {
                toast.error('Transaction validation failed. Please check your stream configuration.');
              } else {
                toast.error('Failed to start stream on blockchain');
              }
              
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      console.error('💥 Failed to start stream:', error);
      console.error('🔍 Error details:', error);
      
      // Provide more specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('Invalid stream ID format')) {
          toast.error('Invalid stream ID. Please create a new stream.');
        } else {
          toast.error(`Failed to start stream: ${error.message}`);
        }
      } else {
        toast.error('Failed to start stream');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndStream = async () => {
    if (!stream || !currentAccount) return;

    setIsEnding(true);
    try {
      const tx = await endStream(stream.id);
      
      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: tx },
          {
            onSuccess: (result) => {
              console.log('Stream ended on blockchain:', result);
              
              // Update local stream status
              const updatedStream = {
                ...stream,
                status: StreamStatus.ENDED,
                endedAt: Date.now()
              };
              
              updateStream(stream.id, updatedStream);
              setStream(updatedStream);
              
              toast.success('Stream ended successfully!');
              resolve(result);
            },
            onError: (error) => {
              console.error('Failed to end stream:', error);
              toast.error('Failed to end stream on blockchain');
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      console.error('Failed to end stream:', error);
      toast.error('Failed to end stream');
    } finally {
      setIsEnding(false);
    }
  };

  const handleViewStream = () => {
    if (stream) {
      navigate(`/stream/${stream.id}`);
    }
  };

  const handleSettings = () => {
    toast.success('Stream settings coming soon!');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStreamMessages = () => {
    return chatMessages.filter(msg => msg.streamId === stream?.id || !msg.streamId);
  };

  if (isLoading || !stream) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">
            {isLoading ? 'Loading stream dashboard...' : 'Stream not found'}
          </div>
          {streamKey && (
            <div className="text-gray-400 text-sm">
              Stream Key: {streamKey}
            </div>
          )}
          {!isLoading && (
            <div className="mt-4">
              <Button onClick={() => navigate('/create')}>
                Create New Stream
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isLive = stream.status === StreamStatus.LIVE;
  const rtmpUrl = `${RTMP_CONFIG.SERVER_URL}/${streamKey}`;

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Stream Dashboard</h1>
              <p className="text-gray-400">{stream.title}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge color={isLive ? 'red' : 'gray'} size="3">
                {isLive ? '🔴 LIVE' : 'OFFLINE'}
              </Badge>
              <Button
                variant="outline"
                onClick={handleViewStream}
                className="border-gray-600"
              >
                <ExternalLink size={16} className="mr-2" />
                View Stream
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stream Controls */}
            <Card className="p-6 bg-gray-800 border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">Stream Controls</h2>
              
              {/* RTMP Configuration */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    RTMP Server URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={rtmpUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white text-sm"
                    />
                    <Button
                      onClick={() => copyToClipboard(rtmpUrl, 'RTMP URL')}
                      className="rounded-l-none"
                      size="2"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stream Key
                  </label>
                  <div className="flex">
                    <input
                      type="password"
                      value={streamKey || ''}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white text-sm"
                    />
                    <Button
                      onClick={() => copyToClipboard(streamKey || '', 'Stream Key')}
                      className="rounded-l-none"
                      size="2"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  {connectionStatus.isConnected ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : connectionStatus.serverRunning ? (
                    <AlertCircle size={20} className="text-yellow-500" />
                  ) : (
                    <AlertCircle size={20} className="text-red-500" />
                  )}
                  <span className="text-white font-medium">
                    {connectionStatus.isConnected 
                      ? 'OBS Connected' 
                      : connectionStatus.serverRunning 
                        ? 'RTMP Server Running - Waiting for OBS Connection'
                        : 'RTMP Server Not Running'
                    }
                  </span>
                </div>
                {connectionStatus.isConnected && (
                  <div className="text-sm text-gray-400">
                    Bitrate: {typeof streamStats.bitrate === 'number' ? streamStats.bitrate : 0} kbps | FPS: {typeof streamStats.fps === 'number' ? streamStats.fps : 30} | {typeof streamStats.resolution === 'string' ? streamStats.resolution : '1920x1080'}
                  </div>
                )}
                {!connectionStatus.serverRunning && (
                  <div className="text-sm text-red-400">
                    Please start the RTMP server first
                  </div>
                )}
              </div>

              {/* Stream Actions */}
              <div className="flex space-x-4">
                {!isLive ? (
                  <Button
                    onClick={handleStartStream}
                    disabled={isStarting || !connectionStatus.serverRunning || !connectionStatus.isConnected}
                    className="bg-green-600 hover:bg-green-700"
                    size="3"
                  >
                    <Play size={16} className="mr-2" />
                    {isStarting ? 'Starting...' : 'Go Live'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleEndStream}
                    disabled={isEnding}
                    className="bg-red-600 hover:bg-red-700"
                    size="3"
                  >
                    <Square size={16} className="mr-2" />
                    {isEnding ? 'Ending...' : 'End Stream'}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="border-gray-600"
                  onClick={handleSettings}
                >
                  <Settings size={16} className="mr-2" />
                  Settings
                </Button>

                {/* Show create new stream button if current stream ID is invalid */}
                {stream?.id && !/^0x[a-fA-F0-9]{64}$/.test(stream.id) && (
                  <Button 
                    variant="outline" 
                    className="border-yellow-600 text-yellow-400"
                    onClick={() => navigate('/create')}
                  >
                    <AlertCircle size={16} className="mr-2" />
                    Create New Stream
                  </Button>
                )}
              </div>
            </Card>

            {/* Stream Analytics */}
            <Card className="p-6 bg-gray-800 border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">Analytics</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{stream.viewerCount}</div>
                  <div className="text-gray-400 text-sm">Current Viewers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {formatSuiAmount(stream.totalRevenue)} SUI
                  </div>
                  <div className="text-gray-400 text-sm">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {getStreamMessages().length}
                  </div>
                  <div className="text-gray-400 text-sm">Chat Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {isLive ? formatUptime(typeof streamStats.uptime === 'number' ? streamStats.uptime : 0) : '00:00:00'}
                  </div>
                  <div className="text-gray-400 text-sm">Uptime</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6 bg-gray-800 border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <Badge color={isLive ? 'red' : 'gray'}>
                    {isLive ? 'LIVE' : 'OFFLINE'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category</span>
                  <span className="text-white">{stream.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rating</span>
                  <span className="text-white">{stream.contentRating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Monetized</span>
                  <span className="text-white">{stream.isMonetized ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </Card>

            {/* Recent Chat */}
            <Card className="p-6 bg-gray-800 border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Chat</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getStreamMessages().slice(-10).map((message) => (
                  <div key={message.id} className="text-sm">
                    <span className="text-blue-400">{message.senderName}:</span>
                    <span className="text-gray-300 ml-2">{message.message}</span>
                  </div>
                ))}
                {getStreamMessages().length === 0 && (
                  <div className="text-gray-400 text-center py-4">
                    No messages yet
                  </div>
                )}
              </div>
            </Card>

            {/* Help */}
            <Card className="p-6 bg-gray-800 border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Need Help?</h3>
              <div className="space-y-3 text-sm text-gray-400">
                {!connectionStatus.serverRunning && (
                  <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg mb-3">
                    <p className="text-red-300 font-medium">⚠️ RTMP Server Required</p>
                    <p className="text-red-200 text-xs mt-1">
                      Run: <code className="bg-gray-800 px-1 rounded">docker run --rm -it -p 1935:1935 -p 8080:8080 -p 1985:1985 ossrs/srs:5</code>
                    </p>
                  </div>
                )}
                <p>• Start the RTMP server (see above if not running)</p>
                <p>• Configure OBS with the RTMP URL and Stream Key above</p>
                <p>• Click "Go Live" once OBS is connected</p>
                <p>• Monitor your analytics in real-time</p>
                <p>• End stream when finished</p>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4 border-gray-600"
                onClick={() => window.open('http://localhost:8080', '_blank')}
              >
                <ExternalLink size={16} className="mr-2" />
                Monitor RTMP Server
              </Button>
            </Card>

            {/* Debug Info */}
            <Card className="p-6 bg-gray-800 border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Debug Info</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <div>
                  <span className="text-gray-300">Stream ID:</span>
                  <div className="font-mono bg-gray-900 p-2 rounded mt-1 break-all">
                    {stream?.id || 'Not available'}
                  </div>
                  <div className="mt-1">
                    {stream?.id && /^0x[a-fA-F0-9]{64}$/.test(stream.id) ? (
                      <span className="text-green-400">✓ Valid format</span>
                    ) : (
                      <span className="text-red-400">✗ Invalid format</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-300">Stream Key:</span>
                  <div className="font-mono bg-gray-900 p-2 rounded mt-1">
                    {streamKey || 'Not available'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-300">Creator:</span>
                  <div className="font-mono bg-gray-900 p-2 rounded mt-1 break-all">
                    {stream?.creator || 'Not available'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-300">Status:</span>
                  <div className="font-mono bg-gray-900 p-2 rounded mt-1">
                    {stream?.status || 'Not available'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamDashboardPage; 
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Container, Button, Card, Badge } from '@radix-ui/themes';
import { Users, Heart, Share2, DollarSign } from 'lucide-react';
import { useStreamStore } from '../stores/streamStore';
import { Stream, StreamStatus, ChatMessage, QualityLevel } from '../types/stream';
import { StreamPlayer } from '../components/video/StreamPlayer';
import { LiveChat } from '../components/stream/LiveChat';
import TipModal from '../components/stream/TipModal';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { formatSuiAmount, sendTip, subscribeToCreator } from '../lib/sui';
import { toast } from 'react-hot-toast';

const StreamPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const { getStreamById, addChatMessage, chatMessages } = useStreamStore();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const [stream, setStream] = useState<Stream | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!streamId) {
      navigate('/');
      return;
    }

    console.log('🔍 Looking for stream with ID:', streamId);

    // Try to get stream from store first
    const foundStream = getStreamById(streamId);
    if (foundStream) {
      console.log('✅ Found real stream:', foundStream);
      setStream(foundStream);
      setIsLoading(false);
    } else {
      console.log('⚠️ Stream not found in store, checking for demo stream...');
      
      // For demo purposes, create a demo stream if not found
      // This handles cases where someone navigates directly to a demo stream URL
      if (streamId.startsWith('demo_')) {
        const demoStream: Stream = {
          id: streamId,
          creator: '0x54fe76c4c8b8b8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8',
          title: 'Live Stream Demo',
          description: 'This is a demo stream showing StreamGuard capabilities',
          category: 'Technology',
          thumbnailWalrusId: '', // Empty for placeholder
          hlsManifestWalrusId: 'demo_manifest',
          status: StreamStatus.LIVE,
          createdAt: Date.now() - 3600000,
          startedAt: Date.now() - 1800000,
          endedAt: 0,
          viewerCount: 1337,
          totalRevenue: 25000000000, // 25 SUI
          qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
          isMonetized: true,
          subscriptionPrice: 10000000000, // 0.01 SUI
          tipEnabled: true,
          moderationScore: 95,
          contentRating: 'General',
          tags: ['demo', 'sui', 'blockchain', 'streaming'],
          metadataBlobId: 'demo_meta',
          streamKey: 'demo_key',
          rtmpUrl: 'rtmp://demo.streamguard.io/live/demo_key',
        };
        console.log('📺 Created demo stream:', demoStream);
        setStream(demoStream);
        setIsLoading(false);
      } else {
        // Real stream not found
        console.log('❌ Real stream not found for ID:', streamId);
        setIsLoading(false);
      }
    }
  }, [streamId, getStreamById, navigate]);

  const getManifestUrl = (stream: Stream): string => {
    if (!stream.hlsManifestWalrusId) {
      console.warn('⚠️ No HLS manifest Walrus ID available');
      return '';
    }

    // For pure demo streams (only those with 'demo_' prefix), return empty
    if (stream.hlsManifestWalrusId.startsWith('demo_')) {
      console.log('📺 Demo manifest ID detected:', stream.hlsManifestWalrusId);
      // For development, we can't actually serve HLS content, so return empty
      return '';
    }

    // For real manifest IDs (including those starting with 'manifest_'), try Walrus
    const walrusUrl = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${stream.hlsManifestWalrusId}`;
    console.log('🔗 Real Walrus manifest URL:', walrusUrl);
    return walrusUrl;
  };

  const handleSendTip = async (amount: number, message: string) => {
    if (!currentAccount || !stream) return;

    try {
      const tipAmountMist = (amount * 1000000000).toString(); // Convert SUI to MIST
      
      // Use the current user's address as the profile ID
      // In a real app, this would be fetched from a user profile system
      const userProfileId = currentAccount.address;
      
      console.log('💰 Sending tip:', {
        amount: amount,
        amountMist: tipAmountMist,
        message: message,
        streamId: stream.id,
        userProfileId: userProfileId
      });
      
      const tx = await sendTip(userProfileId, tipAmountMist, message, stream.id);
      
      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            toast.success(`Tip of ${amount} SUI sent successfully!`);
            setShowTipModal(false);
            
            // Add tip message to chat
            const tipMessage: ChatMessage = {
              id: `tip_${Date.now()}`,
              sender: currentAccount.address,
              senderName: `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`,
              message: `💰 Tipped ${amount} SUI${message ? `: ${message}` : ''}`,
              timestamp: Date.now(),
              type: 'tip',
              streamId: stream.id,
            };
            addChatMessage(tipMessage);
          },
          onError: (error) => {
            console.error('Tip failed:', error);
            console.error('💸 Tip error details:', JSON.stringify(error, null, 2));
            toast.error('Failed to send tip. Please try again.');
          },
        }
      );
    } catch (error) {
      console.error('Error sending tip:', error);
      console.error('💸 Tip preparation error:', error);
      toast.error('Failed to prepare tip. Please try again.');
    }
  };

  const handleSubscribe = async () => {
    if (!currentAccount || !stream) return;

    try {
      // Use the current user's address as the profile ID
      const userProfileId = currentAccount.address;
      
      console.log('📺 Subscribing to creator:', {
        userProfileId: userProfileId,
        creatorId: stream.creator,
        subscriptionType: 'Basic',
        price: stream.subscriptionPrice.toString()
      });
      
      const tx = await subscribeToCreator(
        userProfileId,
        'Basic',
        stream.subscriptionPrice.toString()
      );
      
      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            toast.success('Subscribed successfully!');
            setIsSubscribed(true);
            
            // Add subscription message to chat
            const subMessage: ChatMessage = {
              id: `sub_${Date.now()}`,
              sender: currentAccount.address,
              senderName: `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`,
              message: `🌟 Subscribed to the stream!`,
              timestamp: Date.now(),
              type: 'subscription',
              streamId: stream.id,
            };
            addChatMessage(subMessage);
          },
          onError: (error) => {
            console.error('Subscription failed:', error);
            console.error('📺 Subscription error details:', JSON.stringify(error, null, 2));
            toast.error('Failed to subscribe. Please try again.');
          },
        }
      );
    } catch (error) {
      console.error('Error subscribing:', error);
      console.error('📺 Subscription preparation error:', error);
      toast.error('Failed to prepare subscription. Please try again.');
    }
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim() || !currentAccount) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: currentAccount.address,
      senderName: `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`,
      message: chatInput.trim(),
      timestamp: Date.now(),
      type: 'message',
      streamId: stream?.id,
    };

    addChatMessage(message);
    setChatInput('');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: stream?.title || 'StreamGuard Live Stream',
          text: `Watch "${stream?.title}" on StreamGuard`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Stream URL copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading stream...</div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="p-8 text-center bg-gray-800 border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Stream Not Found</h2>
          <p className="text-gray-400 mb-6">The stream you're looking for doesn't exist or has ended.</p>
          <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const manifestUrl = getManifestUrl(stream);

  return (
    <div className="min-h-screen bg-gray-900">
      <Container className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video Player */}
          <div className="lg:col-span-3">
            <div className="bg-black rounded-lg overflow-hidden mb-4">
              <ErrorBoundary>
                <StreamPlayer
                  manifestUrl={manifestUrl}
                  title={stream.title}
                  isLive={stream.status === StreamStatus.LIVE}
                />
              </ErrorBoundary>
            </div>

            {/* Stream Info */}
            <Card className="p-6 bg-gray-800 border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-2">{stream.title}</h1>
                  <p className="text-gray-400 mb-4">{stream.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Users size={16} />
                      <span>{stream.viewerCount.toLocaleString()} viewers</span>
                    </div>
                    <Badge color="blue">{stream.category}</Badge>
                    <Badge color={stream.status === StreamStatus.LIVE ? 'red' : 'gray'}>
                      {stream.status === StreamStatus.LIVE ? '🔴 LIVE' : 'OFFLINE'}
                    </Badge>
                    <Badge color="green">
                      {stream.moderationScore}% Safe
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="2"
                    onClick={handleShare}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Share2 size={16} />
                  </Button>
                  <Button
                    variant={isFollowing ? 'solid' : 'outline'}
                    size="2"
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={isFollowing ? 'bg-red-600 hover:bg-red-700' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}
                  >
                    <Heart size={16} className={isFollowing ? 'fill-current' : ''} />
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </div>
              </div>

              {/* Creator Info */}
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {stream.creator.slice(2, 4).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">
                      {stream.creator.slice(0, 6)}...{stream.creator.slice(-4)}
                    </h3>
                    <p className="text-gray-400 text-sm">Creator</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {stream.isMonetized && !isSubscribed && (
                    <Button
                      onClick={handleSubscribe}
                      disabled={!currentAccount}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Subscribe ({formatSuiAmount(stream.subscriptionPrice)} SUI)
                    </Button>
                  )}
                  {isSubscribed && (
                    <Badge color="green">✓ Subscribed</Badge>
                  )}
                  {stream.tipEnabled && (
                    <Button
                      onClick={() => setShowTipModal(true)}
                      disabled={!currentAccount}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      <DollarSign size={16} className="mr-1" />
                      Tip Creator
                    </Button>
                  )}
                </div>
              </div>

              {/* Tags */}
              {stream.tags.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {stream.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-gray-400 border-gray-600">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Debug Info for Development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                  <h4 className="text-yellow-400 font-semibold mb-2">🔧 Development Info</h4>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>Stream ID: {stream.id}</div>
                    <div>Status: {stream.status}</div>
                    <div>Manifest ID: {stream.hlsManifestWalrusId}</div>
                    <div>Manifest URL: {manifestUrl || 'Not available'}</div>
                    <div>Thumbnail ID: {stream.thumbnailWalrusId || 'Using placeholder'}</div>
                    {stream.thumbnailWalrusId && (
                      <div>Thumbnail URL: https://aggregator.walrus-testnet.walrus.space/v1/blobs/{stream.thumbnailWalrusId}</div>
                    )}
                    <div className="mt-2 p-2 bg-blue-900 bg-opacity-30 rounded">
                      <div className="text-blue-300 font-medium">Walrus URL Format:</div>
                      <div className="text-blue-200 text-xs">https://aggregator.walrus-testnet.walrus.space/v1/blobs/&lt;blob-id&gt;</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Live Chat */}
          <div className="lg:col-span-1">
            <LiveChat
              messages={chatMessages.filter(msg => !msg.streamId || msg.streamId === stream.id)}
              onSendMessage={handleSendChatMessage}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isConnected={!!currentAccount}
              streamId={stream.id}
            />
          </div>
        </div>
      </Container>

      {/* Tip Modal */}
      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        onTip={handleSendTip}
        creatorName={`${stream.creator.slice(0, 6)}...${stream.creator.slice(-4)}`}
      />
    </div>
  );
};

export default StreamPage; 
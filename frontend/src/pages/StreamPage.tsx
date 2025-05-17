import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Container } from '@radix-ui/themes';
import StreamPlayer from '../components/video/StreamPlayer';
import { useCurrentStream, useCurrentSession, useStreamStore } from '../stores/streamStore';
import { Stream, QualityLevel } from '../types/stream';
import { walrusService } from '../lib/walrus';

interface StreamPageProps {}

export const StreamPage: React.FC<StreamPageProps> = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  
  const currentStream = useCurrentStream();
  const currentSession = useCurrentSession();
  const { 
    setCurrentStream, 
    joinStream, 
    leaveStream, 
    sendTip, 
    updateViewerCount,
    streams 
  } = useStreamStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Load stream data
  useEffect(() => {
    if (!streamId) {
      navigate('/');
      return;
    }

    const loadStream = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get stream from store or fetch it
        let stream = streams[streamId];
        if (!stream) {
          // In a real app, this would fetch from API
          setError('Stream not found');
          return;
        }

        setCurrentStream(stream);
        
        // Join the stream
        await joinStream(streamId);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load stream:', error);
        setError(`Failed to load stream: ${(error as Error).message}`);
        setIsLoading(false);
      }
    };

    loadStream();

    // Cleanup on unmount
    return () => {
      leaveStream();
    };
  }, [streamId, streams, setCurrentStream, joinStream, leaveStream, navigate]);

  // Mock chat messages
  useEffect(() => {
    if (currentStream) {
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          user: 'viewer1',
          message: 'Great stream! 🔥',
          timestamp: Date.now() - 60000,
          type: 'message',
        },
        {
          id: '2',
          user: 'viewer2',
          message: 'Just tipped 0.1 SUI! Keep it up!',
          timestamp: Date.now() - 30000,
          type: 'tip',
          amount: 0.1,
        },
        {
          id: '3',
          user: 'viewer3',
          message: 'What quality are you streaming at?',
          timestamp: Date.now() - 15000,
          type: 'message',
        },
      ];
      setChatMessages(mockMessages);
    }
  }, [currentStream]);

  const handleTipSubmit = async () => {
    if (!currentStream || !tipAmount) return;

    try {
      const amount = parseFloat(tipAmount) * 1000000000; // Convert SUI to MIST
      await sendTip(currentStream.id, amount, tipMessage);
      
      // Add tip message to chat
      const tipChatMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'You',
        message: tipMessage || `Tipped ${tipAmount} SUI`,
        timestamp: Date.now(),
        type: 'tip',
        amount: parseFloat(tipAmount),
      };
      setChatMessages(prev => [...prev, tipChatMessage]);
      
      setShowTipModal(false);
      setTipAmount('');
      setTipMessage('');
    } catch (error) {
      console.error('Failed to send tip:', error);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      user: 'You',
      message: newMessage,
      timestamp: Date.now(),
      type: 'message',
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const formatViewerCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatDuration = (startTime: number): string => {
    const duration = Date.now() - startTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-white text-xl">Loading stream...</div>
        </div>
      </div>
    );
  }

  if (error || !currentStream) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <div className="text-white text-2xl mb-4">Stream Error</div>
          <div className="text-gray-400 mb-6">{error || 'Stream not found'}</div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main video player */}
          <div className="lg:col-span-3">
            <div className="bg-black rounded-lg overflow-hidden">
              <StreamPlayer
                streamId={currentStream.id}
                walrusManifestId={currentStream.hlsManifestWalrusId}
                autoplay={true}
                controls={true}
                qualityLevels={currentStream.qualityLevels}
                className="w-full"
                width={1280}
                height={720}
                onError={(error) => setError(error.message)}
              />
            </div>

            {/* Stream info */}
            <div className="mt-6 bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {currentStream.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-gray-400 text-sm">
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      LIVE
                    </span>
                    <span>👁 {formatViewerCount(currentStream.viewerCount)} viewers</span>
                    <span>⏱ {formatDuration(currentStream.startedAt)}</span>
                    <span className="bg-blue-900 bg-opacity-50 px-2 py-1 rounded">
                      {currentStream.category}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex space-x-3">
                  {currentStream.tipEnabled && (
                    <button
                      onClick={() => setShowTipModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    >
                      💝 Tip Creator
                    </button>
                  )}
                  <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    🔗 Share
                  </button>
                </div>
              </div>

              {/* Creator info */}
              <div className="flex items-center justify-between py-4 border-t border-gray-700">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {currentStream.creator.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <div className="text-white font-semibold">
                      {currentStream.creator.slice(0, 8)}...{currentStream.creator.slice(-4)}
                    </div>
                    <div className="text-gray-400 text-sm">Creator</div>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Follow
                </button>
              </div>

              {/* Description */}
              {currentStream.description && (
                <div className="mt-4">
                  <h3 className="text-white font-semibold mb-2">Description</h3>
                  <p className="text-gray-300">{currentStream.description}</p>
                </div>
              )}

              {/* Tags */}
              {currentStream.tags.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-white font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentStream.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg h-full flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Live Chat</h3>
                <div className="text-gray-400 text-sm">
                  {formatViewerCount(currentStream.viewerCount)} viewers
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((message) => (
                  <ChatMessageComponent key={message.id} message={message} />
                ))}
              </div>

              {/* Chat input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Say something..."
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-white text-xl font-semibold mb-4">Send Tip</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Amount (SUI)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  placeholder="0.001"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={tipMessage}
                  onChange={(e) => setTipMessage(e.target.value)}
                  placeholder="Great stream!"
                  rows={3}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowTipModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTipSubmit}
                disabled={!tipAmount}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Tip
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Chat message types
interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: number;
  type: 'message' | 'tip' | 'system';
  amount?: number;
}

const ChatMessageComponent: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStyle = () => {
    switch (message.type) {
      case 'tip':
        return 'border-l-4 border-green-500 bg-green-900 bg-opacity-20';
      case 'system':
        return 'border-l-4 border-blue-500 bg-blue-900 bg-opacity-20';
      default:
        return '';
    }
  };

  return (
    <div className={`p-2 rounded ${getMessageStyle()}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-blue-400 text-sm font-medium">{message.user}</span>
        <span className="text-gray-500 text-xs">{formatTime(message.timestamp)}</span>
      </div>
      <div className="text-gray-300 text-sm">
        {message.type === 'tip' && message.amount && (
          <span className="text-green-400 font-medium">
            💝 Tipped {message.amount} SUI: 
          </span>
        )}
        {message.message}
      </div>
    </div>
  );
};

export default StreamPage; 
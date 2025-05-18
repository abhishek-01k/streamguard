import React, { useEffect, useRef } from 'react';
import { Send, MessageCircle, DollarSign, UserPlus } from 'lucide-react';
import { Card, Button, Badge } from '@radix-ui/themes';
import { ChatMessage } from '../../types/stream';

interface LiveChatProps {
  messages: ChatMessage[];
  onSendMessage: () => void;
  chatInput: string;
  setChatInput: (value: string) => void;
  isConnected: boolean;
  streamId: string;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  onSendMessage,
  chatInput,
  setChatInput,
  isConnected,
  streamId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.trim() && isConnected) {
        onSendMessage();
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'tip':
        return <DollarSign size={14} className="text-yellow-500" />;
      case 'subscription':
        return <UserPlus size={14} className="text-green-500" />;
      case 'system':
        return <MessageCircle size={14} className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getMessageStyle = (type: ChatMessage['type']) => {
    switch (type) {
      case 'tip':
        return 'bg-yellow-500 bg-opacity-10 border-l-4 border-yellow-500';
      case 'subscription':
        return 'bg-green-500 bg-opacity-10 border-l-4 border-green-500';
      case 'system':
        return 'bg-blue-500 bg-opacity-10 border-l-4 border-blue-500';
      default:
        return '';
    }
  };

  // Filter messages for this stream
  const streamMessages = messages.filter(msg => 
    !msg.streamId || msg.streamId === streamId
  );

  return (
    <Card className="h-[600px] flex flex-col bg-gray-800 border-gray-700">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <MessageCircle size={20} className="text-blue-400" />
          <h3 className="text-white font-semibold">Live Chat</h3>
          <Badge variant="outline" className="text-gray-400 border-gray-600">
            {streamMessages.length}
          </Badge>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {streamMessages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Be the first to say hello!</p>
          </div>
        ) : (
          streamMessages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${getMessageStyle(message.type)}`}
            >
              <div className="flex items-start space-x-2">
                {getMessageIcon(message.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-white truncate">
                      {message.senderName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.type === 'tip' && message.amount && (
                      <Badge color="yellow" className="text-xs">
                        {message.amount} SUI
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 break-words">
                    {message.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-700">
        {isConnected ? (
          <div className="flex space-x-2">
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              maxLength={500}
              className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
            <Button
              onClick={onSendMessage}
              disabled={!chatInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 px-4"
            >
              <Send size={16} />
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-400 mb-3">Connect your wallet to chat</p>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled
            >
              Connect Wallet
            </Button>
          </div>
        )}
        
        {/* Character count */}
        {isConnected && (
          <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
            <span>Press Enter to send</span>
            <span>{chatInput.length}/500</span>
          </div>
        )}
      </div>

      {/* Chat Rules */}
      <div className="p-3 bg-gray-700 text-xs text-gray-400">
        <p className="mb-1">💬 Be respectful and follow community guidelines</p>
        <p>🚫 No spam, hate speech, or inappropriate content</p>
      </div>
    </Card>
  );
}; 
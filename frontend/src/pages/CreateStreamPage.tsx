import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button, Card, Container, Flex, Text, TextField } from '@radix-ui/themes';
import { Stream, StreamStatus, QualityLevel } from '../types/stream';
import { useStreamStore } from '../stores/streamStore';

const CATEGORIES = [
  'Gaming',
  'Technology',
  'Education',
  'Music',
  'Art',
  'Sports',
  'Entertainment',
  'News',
  'Lifestyle',
  'Science',
];

export const CreateStreamPage: React.FC = () => {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const { addStream } = useStreamStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Gaming',
    isMonetized: false,
    subscriptionPrice: 0,
    tipEnabled: true,
    contentRating: 'General' as 'General' | 'Teen' | 'Mature',
    tags: '',
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [streamKey, setStreamKey] = useState<string>('');
  const [rtmpUrl, setRtmpUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateStreamKey = () => {
    return `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleCreateStream = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formData.title.trim()) {
      alert('Please enter a stream title');
      return;
    }

    setIsCreating(true);

    try {
      // Generate stream key and RTMP URL
      const newStreamKey = generateStreamKey();
      const newRtmpUrl = `rtmp://ingest.streamguard.io/live/${newStreamKey}`;
      
      setStreamKey(newStreamKey);
      setRtmpUrl(newRtmpUrl);

      // Create new stream object
      const newStream: Stream = {
        id: `stream_${Date.now()}`,
        creator: currentAccount.address,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        thumbnailWalrusId: 'mock_thumbnail_new',
        hlsManifestWalrusId: 'mock_manifest_new',
        status: StreamStatus.CREATED,
        createdAt: Date.now(),
        startedAt: 0,
        endedAt: 0,
        viewerCount: 0,
        totalRevenue: 0,
        qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
        isMonetized: formData.isMonetized,
        subscriptionPrice: formData.isMonetized ? formData.subscriptionPrice * 1000000000 : 0, // Convert to SUI units
        tipEnabled: formData.tipEnabled,
        moderationScore: 100,
        contentRating: formData.contentRating,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      };

      // Add stream to store
      addStream(newStream);

      // Navigate to stream page
      navigate(`/stream/${newStream.id}`);
      
    } catch (error) {
      console.error('Failed to create stream:', error);
      alert('Failed to create stream. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, you would upload to Walrus here
      console.log('Thumbnail file selected:', file.name);
      // For now, just show a success message
      alert('Thumbnail uploaded successfully! (Demo mode)');
    }
  };

  if (!currentAccount) {
    return (
      <Container className="py-8">
        <Card className="max-w-md mx-auto p-6 text-center">
          <Text size="5" weight="bold" className="mb-4 block">
            Connect Wallet Required
          </Text>
          <Text className="mb-4 block text-gray-400">
            Please connect your wallet to create a live stream.
          </Text>
          <Button onClick={() => navigate('/')}>
            Go Back
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Live Stream</h1>
          <p className="text-gray-400">Set up your live stream and start broadcasting to the world</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stream Configuration */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Stream Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stream Title *
                </label>
                <TextField.Root
                  placeholder="Enter your stream title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Describe what your stream is about..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma separated)
                </label>
                <TextField.Root
                  placeholder="gaming, tutorial, live"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Thumbnail
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  Upload Thumbnail
                </Button>
              </div>
            </div>
          </Card>

          {/* Monetization Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Monetization</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="monetized"
                  checked={formData.isMonetized}
                  onChange={(e) => handleInputChange('isMonetized', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="monetized" className="text-sm font-medium text-gray-300">
                  Enable Subscriptions
                </label>
              </div>

              {formData.isMonetized && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subscription Price (SUI)
                  </label>
                  <TextField.Root
                    type="number"
                    placeholder="0.001"
                    step="0.001"
                    min="0"
                    value={formData.subscriptionPrice}
                    onChange={(e) => handleInputChange('subscriptionPrice', parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="tips"
                  checked={formData.tipEnabled}
                  onChange={(e) => handleInputChange('tipEnabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="tips" className="text-sm font-medium text-gray-300">
                  Enable Tips
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content Rating
                </label>
                <select
                  value={formData.contentRating}
                  onChange={(e) => handleInputChange('contentRating', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General">General</option>
                  <option value="Teen">Teen</option>
                  <option value="Mature">Mature</option>
                </select>
              </div>
            </div>

            {/* Stream Key Section */}
            {streamKey && (
              <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Stream Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      RTMP URL
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={rtmpUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white text-sm"
                      />
                      <Button
                        onClick={() => navigator.clipboard.writeText(rtmpUrl)}
                        className="rounded-l-none"
                        size="2"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Stream Key
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={streamKey}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white text-sm"
                      />
                      <Button
                        onClick={() => navigator.clipboard.writeText(streamKey)}
                        className="rounded-l-none"
                        size="2"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            size="3"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateStream}
            disabled={isCreating || !formData.title.trim()}
            size="3"
          >
            {isCreating ? 'Creating...' : 'Create Stream'}
          </Button>
        </div>

        {/* Instructions */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How to Start Streaming</h3>
          <div className="space-y-3 text-gray-300">
            <p>1. <strong>Create your stream</strong> using the form above</p>
            <p>2. <strong>Copy the RTMP URL and Stream Key</strong> that will be generated</p>
            <p>3. <strong>Configure your streaming software</strong> (OBS, Streamlabs, etc.) with these credentials</p>
            <p>4. <strong>Start streaming</strong> from your software</p>
            <p>5. <strong>Go live</strong> and share your stream with the world!</p>
          </div>
          
          <div className="mt-4 p-4 bg-blue-900 bg-opacity-30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>💡 Pro Tip:</strong> Test your stream setup before going live. Make sure your internet connection is stable and your streaming software is properly configured.
            </p>
          </div>
        </Card>
      </div>
    </Container>
  );
};

export default CreateStreamPage; 
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StreamList from '../components/stream/StreamList';
import { useLiveStreams, useStreamStore } from '../stores/streamStore';
import { Stream, StreamStatus, QualityLevel } from '../types/stream';

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

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const liveStreams = useLiveStreams();
  const { setStreams, isLoading } = useStreamStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize with mock data
  useEffect(() => {
    const initializeMockData = () => {
      const mockStreams: Stream[] = [
        {
          id: 'stream_1',
          creator: '0x1234567890abcdef1234567890abcdef12345678',
          title: 'Building DeFi on Sui - Live Coding Session',
          description: 'Join me as I build a decentralized exchange on Sui blockchain. We\'ll cover Move smart contracts, object-centric programming, and more!',
          category: 'Technology',
          thumbnailWalrusId: 'mock_thumbnail_1',
          hlsManifestWalrusId: 'mock_manifest_1',
          status: StreamStatus.LIVE,
          createdAt: Date.now() - 3600000,
          startedAt: Date.now() - 1800000,
          endedAt: 0,
          viewerCount: 1247,
          totalRevenue: 5000000000,
          qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
          isMonetized: true,
          subscriptionPrice: 1000000000,
          tipEnabled: true,
          moderationScore: 95,
          contentRating: 'General',
          tags: ['sui', 'blockchain', 'defi', 'coding', 'tutorial'],
        },
        {
          id: 'stream_2',
          creator: '0xabcdef1234567890abcdef1234567890abcdef12',
          title: 'Epic Gaming Marathon - 24 Hours of Indie Games',
          description: 'Playing the best indie games for 24 hours straight! Come hang out and discover some amazing games.',
          category: 'Gaming',
          thumbnailWalrusId: 'mock_thumbnail_2',
          hlsManifestWalrusId: 'mock_manifest_2',
          status: StreamStatus.LIVE,
          createdAt: Date.now() - 7200000,
          startedAt: Date.now() - 3600000,
          endedAt: 0,
          viewerCount: 892,
          totalRevenue: 2500000000,
          qualityLevels: [QualityLevel.QUALITY_480P, QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
          isMonetized: false,
          subscriptionPrice: 0,
          tipEnabled: true,
          moderationScore: 88,
          contentRating: 'Teen',
          tags: ['gaming', 'indie', 'marathon', 'variety'],
        },
        {
          id: 'stream_3',
          creator: '0x9876543210fedcba9876543210fedcba98765432',
          title: 'Digital Art Creation - NFT Collection Process',
          description: 'Watch me create a new NFT collection from scratch using Procreate and Photoshop. Tips and tricks included!',
          category: 'Art',
          thumbnailWalrusId: 'mock_thumbnail_3',
          hlsManifestWalrusId: 'mock_manifest_3',
          status: StreamStatus.LIVE,
          createdAt: Date.now() - 1800000,
          startedAt: Date.now() - 900000,
          endedAt: 0,
          viewerCount: 456,
          totalRevenue: 1200000000,
          qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P, QualityLevel.QUALITY_4K],
          isMonetized: true,
          subscriptionPrice: 500000000,
          tipEnabled: true,
          moderationScore: 92,
          contentRating: 'General',
          tags: ['art', 'nft', 'digital', 'tutorial', 'creative'],
        },
        {
          id: 'stream_4',
          creator: '0xfedcba9876543210fedcba9876543210fedcba98',
          title: 'Learn Mandarin Chinese - Beginner Lesson 15',
          description: 'Interactive Mandarin Chinese lesson for beginners. Today we\'re learning about food and restaurants!',
          category: 'Education',
          thumbnailWalrusId: 'mock_thumbnail_4',
          hlsManifestWalrusId: 'mock_manifest_4',
          status: StreamStatus.LIVE,
          createdAt: Date.now() - 900000,
          startedAt: Date.now() - 600000,
          endedAt: 0,
          viewerCount: 234,
          totalRevenue: 800000000,
          qualityLevels: [QualityLevel.QUALITY_480P, QualityLevel.QUALITY_720P],
          isMonetized: true,
          subscriptionPrice: 2000000000,
          tipEnabled: true,
          moderationScore: 98,
          contentRating: 'General',
          tags: ['education', 'language', 'mandarin', 'chinese', 'lesson'],
        },
        {
          id: 'stream_5',
          creator: '0x1111222233334444555566667777888899990000',
          title: 'Live Jazz Performance from NYC',
          description: 'Intimate jazz performance featuring original compositions and classic standards. High-quality audio setup!',
          category: 'Music',
          thumbnailWalrusId: 'mock_thumbnail_5',
          hlsManifestWalrusId: 'mock_manifest_5',
          status: StreamStatus.LIVE,
          createdAt: Date.now() - 2700000,
          startedAt: Date.now() - 2400000,
          endedAt: 0,
          viewerCount: 678,
          totalRevenue: 3200000000,
          qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
          isMonetized: true,
          subscriptionPrice: 1500000000,
          tipEnabled: true,
          moderationScore: 96,
          contentRating: 'General',
          tags: ['music', 'jazz', 'live', 'performance', 'nyc'],
        },
      ];

      setStreams(mockStreams);
    };

    if (liveStreams.length === 0) {
      initializeMockData();
    }
  }, [liveStreams.length, setStreams]);

  const handleStreamSelect = (stream: Stream) => {
    navigate(`/stream/${stream.id}`);
  };

  const filteredStreams = liveStreams.filter(stream => {
    const matchesCategory = !selectedCategory || stream.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const featuredStreams = liveStreams
    .filter(stream => stream.viewerCount > 500)
    .slice(0, 3);

  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    liveStreams.forEach(stream => {
      stats[stream.category] = (stats[stream.category] || 0) + 1;
    });
    return stats;
  };

  const categoryStats = getCategoryStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-white text-xl">Loading streams...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">
                🌊 StreamGuard
              </h1>
              <span className="text-gray-400 text-sm">
                Decentralized Live Streaming
              </span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search streams, creators, or tags..."
                  className="w-full bg-gray-700 text-white px-4 py-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  🔍
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="text-white font-semibold">{liveStreams.length}</div>
                <div className="text-gray-400">Live Streams</div>
              </div>
              <div className="text-center">
                <div className="text-white font-semibold">
                  {liveStreams.reduce((sum, stream) => sum + stream.viewerCount, 0).toLocaleString()}
                </div>
                <div className="text-gray-400">Total Viewers</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Featured Streams */}
        {featuredStreams.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">🔥 Featured Streams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredStreams.map((stream) => (
                <FeaturedStreamCard
                  key={stream.id}
                  stream={stream}
                  onClick={() => handleStreamSelect(stream)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">📂 Categories</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All ({liveStreams.length})
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category} ({categoryStats[category] || 0})
              </button>
            ))}
          </div>
        </section>

        {/* Live Streams */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {selectedCategory ? `${selectedCategory} Streams` : '🔴 Live Now'}
            </h2>
            <div className="text-gray-400 text-sm">
              {filteredStreams.length} stream{filteredStreams.length !== 1 ? 's' : ''} found
            </div>
          </div>

          <StreamList
            category={selectedCategory}
            onStreamSelect={handleStreamSelect}
          />
        </section>

        {/* Empty State */}
        {filteredStreams.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📺</div>
            <div className="text-white text-2xl mb-2">No streams found</div>
            <div className="text-gray-400 mb-6">
              {searchQuery
                ? `No streams match "${searchQuery}"`
                : selectedCategory
                ? `No live streams in ${selectedCategory}`
                : 'No live streams available right now'
              }
            </div>
            <div className="space-x-4">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  View All Categories
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface FeaturedStreamCardProps {
  stream: Stream;
  onClick: () => void;
}

const FeaturedStreamCard: React.FC<FeaturedStreamCardProps> = ({ stream, onClick }) => {
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

  return (
    <div
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-xl border border-gray-700"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-700">
        <img
          src={`https://via.placeholder.com/400x225/1f2937/ffffff?text=${encodeURIComponent(stream.title)}`}
          alt={stream.title}
          className="w-full h-full object-cover"
        />
        
        {/* Featured badge */}
        <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
          ⭐ FEATURED
        </div>
        
        {/* Live indicator */}
        <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
          ● LIVE
        </div>
        
        {/* Stats overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between">
          <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            👁 {formatViewerCount(stream.viewerCount)}
          </div>
          <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            ⏱ {formatDuration(stream.startedAt)}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
          {stream.title}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-blue-400 text-sm bg-blue-900 bg-opacity-30 px-2 py-1 rounded">
            {stream.category}
          </span>
          <span className="text-gray-400 text-sm">
            {stream.creator.slice(0, 6)}...{stream.creator.slice(-4)}
          </span>
        </div>
        
        <p className="text-gray-300 text-sm line-clamp-2 mb-4">
          {stream.description}
        </p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {stream.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
            >
              #{tag}
            </span>
          ))}
          {stream.tags.length > 3 && (
            <span className="text-xs text-gray-400">
              +{stream.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage; 
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button, Card, Badge } from '@radix-ui/themes';
import { Play, Users, TrendingUp, Star, Zap } from 'lucide-react';
import { useStreamStore } from '../stores/streamStore';
import { Stream, StreamStatus, QualityLevel } from '../types/stream';
import { getThumbnailUrlWithFallback, createPlaceholderThumbnail } from '../utils/thumbnails';
import { formatSuiAmount } from '../lib/sui';

const FEATURED_CATEGORIES = [
  { name: 'Gaming', icon: '🎮', color: 'bg-purple-600' },
  { name: 'Technology', icon: '💻', color: 'bg-blue-600' },
  { name: 'Education', icon: '📚', color: 'bg-green-600' },
  { name: 'Music', icon: '🎵', color: 'bg-pink-600' },
  { name: 'Art', icon: '🎨', color: 'bg-orange-600' },
  { name: 'Sports', icon: '⚽', color: 'bg-red-600' },
];

const DEMO_STREAMS: Stream[] = [
  {
    id: 'demo_1',
    creator: '0x1234...5678',
    title: 'Building DeFi on Sui - Live Coding Session',
    description: 'Join me as I build a decentralized exchange on Sui blockchain',
    category: 'Technology',
    thumbnailWalrusId: '', // Empty so it will use placeholder
    hlsManifestWalrusId: 'manifest_1',
    status: StreamStatus.LIVE,
    createdAt: Date.now() - 3600000,
    startedAt: Date.now() - 1800000,
    endedAt: 0,
    viewerCount: 1247,
    totalRevenue: 15000000000, // 15 SUI
    qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
    isMonetized: true,
    subscriptionPrice: 10000000000, // 0.01 SUI
    tipEnabled: true,
    moderationScore: 95,
    contentRating: 'General',
    tags: ['sui', 'defi', 'coding', 'blockchain'],
    metadataBlobId: 'meta_1',
    streamKey: 'sk_demo_1',
    rtmpUrl: 'rtmp://demo.streamguard.io/live/sk_demo_1',
  },
  {
    id: 'demo_2',
    creator: '0x9876...5432',
    title: 'Epic Gaming Marathon - 24 Hours of Sui Games',
    description: 'Playing the latest games built on Sui blockchain',
    category: 'Gaming',
    thumbnailWalrusId: '', // Empty so it will use placeholder
    hlsManifestWalrusId: 'manifest_2',
    status: StreamStatus.LIVE,
    createdAt: Date.now() - 7200000,
    startedAt: Date.now() - 3600000,
    endedAt: 0,
    viewerCount: 3421,
    totalRevenue: 45000000000, // 45 SUI
    qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
    isMonetized: true,
    subscriptionPrice: 5000000000, // 0.005 SUI
    tipEnabled: true,
    moderationScore: 98,
    contentRating: 'Teen',
    tags: ['gaming', 'sui', 'marathon', 'blockchain'],
    metadataBlobId: 'meta_2',
    streamKey: 'sk_demo_2',
    rtmpUrl: 'rtmp://demo.streamguard.io/live/sk_demo_2',
  },
  {
    id: 'demo_3',
    creator: '0x5555...7777',
    title: 'Learn Sui Move Programming - Beginner Friendly',
    description: 'Complete tutorial series for Move smart contract development',
    category: 'Education',
    thumbnailWalrusId: '', // Empty so it will use placeholder
    hlsManifestWalrusId: 'manifest_3',
    status: StreamStatus.LIVE,
    createdAt: Date.now() - 1800000,
    startedAt: Date.now() - 900000,
    endedAt: 0,
    viewerCount: 892,
    totalRevenue: 8000000000, // 8 SUI
    qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
    isMonetized: true,
    subscriptionPrice: 15000000000, // 0.015 SUI
    tipEnabled: true,
    moderationScore: 100,
    contentRating: 'General',
    tags: ['education', 'move', 'programming', 'tutorial'],
    metadataBlobId: 'meta_3',
    streamKey: 'sk_demo_3',
    rtmpUrl: 'rtmp://demo.streamguard.io/live/sk_demo_3',
  },
];

interface StreamCardProps {
  stream: Stream;
}

const StreamCard: React.FC<StreamCardProps> = ({ stream }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');

  useEffect(() => {
    // Use the improved thumbnail function with fallback
    const url = getThumbnailUrlWithFallback(
      stream.thumbnailWalrusId,
      stream.title,
      stream.category,
      stream.status === StreamStatus.LIVE
    );
    setThumbnailUrl(url);
  }, [stream]);

  const formatDuration = (startTime: number) => {
    const duration = Date.now() - startTime;
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Fallback to placeholder if Walrus image fails to load
    const target = e.target as HTMLImageElement;
    const placeholderUrl = createPlaceholderThumbnail(
      stream.title,
      stream.category,
      stream.status === StreamStatus.LIVE
    );
    target.src = placeholderUrl;
  };

  return (
    <Link to={`/stream/${stream.id}`} className="block group">
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group-hover:scale-105 bg-gray-800 border-gray-700">
        <div className="relative">
          <img
            src={thumbnailUrl}
            alt={stream.title}
            className="w-full h-48 object-cover"
            onError={handleImageError}
          />
          
          {/* Live indicator */}
          {stream.status === StreamStatus.LIVE && (
            <div className="absolute top-3 left-3 flex items-center space-x-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>
          )}
          
          {/* Viewer count */}
          <div className="absolute top-3 right-3 flex items-center space-x-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs">
            <Users size={12} />
            <span>{stream.viewerCount.toLocaleString()}</span>
          </div>
          
          {/* Duration */}
          {stream.status === StreamStatus.LIVE && (
            <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
              {formatDuration(stream.startedAt)}
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50">
            <div className="bg-blue-600 rounded-full p-3">
              <Play size={24} className="text-white fill-current" />
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-white font-semibold text-sm line-clamp-2 flex-1">
              {stream.title}
            </h3>
            {stream.isMonetized && (
              <Badge color="green" className="ml-2 text-xs">
                💰 {formatSuiAmount(stream.subscriptionPrice)} SUI
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="bg-gray-700 px-2 py-1 rounded">{stream.category}</span>
            <span>{stream.creator.slice(0, 6)}...{stream.creator.slice(-4)}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <TrendingUp size={12} />
                <span>{formatSuiAmount(stream.totalRevenue)} SUI</span>
              </span>
              <span className="flex items-center space-x-1">
                <Star size={12} />
                <span>{stream.moderationScore}%</span>
              </span>
            </div>
            <Badge color={stream.contentRating === 'General' ? 'green' : stream.contentRating === 'Teen' ? 'yellow' : 'red'}>
              {stream.contentRating}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
};

const HomePage: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { streams, getLiveStreams } = useStreamStore();
  const [allStreams, setAllStreams] = useState<Stream[]>([]);

  useEffect(() => {
    // Combine real streams with demo streams for a rich experience
    const liveStreams = getLiveStreams();
    const combinedStreams = [...DEMO_STREAMS, ...liveStreams];
    setAllStreams(combinedStreams);
  }, [streams, getLiveStreams]);

  const liveStreams = allStreams.filter(stream => stream.status === StreamStatus.LIVE);
  const featuredStreams = liveStreams.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900 py-20">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Stream on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Sui</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              The first decentralized streaming platform powered by Sui blockchain and Walrus storage.
              Own your content, earn directly, stream globally.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {currentAccount ? (
                <Link to="/create">
                  <Button size="4" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                    <Zap className="mr-2" size={20} />
                    Start Streaming
                  </Button>
                </Link>
              ) : (
                <Button size="4" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg" disabled>
                  Connect Wallet to Stream
                </Button>
              )}
              <Button size="4" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 text-lg">
                <Play className="mr-2" size={20} />
                Watch Live
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-400">{liveStreams.length}</div>
              <div className="text-gray-400">Live Streams</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">
                {liveStreams.reduce((sum, stream) => sum + stream.viewerCount, 0).toLocaleString()}
              </div>
              <div className="text-gray-400">Total Viewers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">
                {formatSuiAmount(liveStreams.reduce((sum, stream) => sum + stream.totalRevenue, 0))} SUI
              </div>
              <div className="text-gray-400">Creator Earnings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">0%</div>
              <div className="text-gray-400">Platform Downtime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Browse Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {FEATURED_CATEGORIES.map((category) => (
              <Link
                key={category.name}
                to={`/category/${category.name.toLowerCase()}`}
                className="group"
              >
                <Card className="p-6 text-center hover:shadow-xl transition-all duration-300 group-hover:scale-105 bg-gray-800 border-gray-700">
                  <div className={`w-16 h-16 ${category.color} rounded-full flex items-center justify-center mx-auto mb-3 text-2xl`}>
                    {category.icon}
                  </div>
                  <h3 className="text-white font-semibold">{category.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {liveStreams.filter(s => s.category === category.name).length} live
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Live Streams */}
      <div className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">🔴 Live Now</h2>
            <Link to="/browse">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                View All
              </Button>
            </Link>
          </div>
          
          {featuredStreams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredStreams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center bg-gray-800 border-gray-700">
              <div className="text-6xl mb-4">📺</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Live Streams</h3>
              <p className="text-gray-400 mb-6">Be the first to go live on StreamGuard!</p>
              {currentAccount && (
                <Link to="/create-stream">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Start Your Stream
                  </Button>
                </Link>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Why StreamGuard?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center bg-gray-900 border-gray-700">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Decentralized</h3>
              <p className="text-gray-400">
                Your content is stored on Walrus and governed by smart contracts. No single point of failure.
              </p>
            </Card>
            
            <Card className="p-8 text-center bg-gray-900 border-gray-700">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Creator Economy</h3>
              <p className="text-gray-400">
                Direct monetization with tips, subscriptions, and NFT content ownership. Keep 95%+ of earnings.
              </p>
            </Card>
            
            <Card className="p-8 text-center bg-gray-900 border-gray-700">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Moderation</h3>
              <p className="text-gray-400">
                Community-driven content moderation with transparent governance and appeal processes.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, Badge } from '@radix-ui/themes';
import { Play, Users, TrendingUp, Star, ArrowLeft } from 'lucide-react';
import { useStreamStore } from '../stores/streamStore';
import { Stream, StreamStatus, QualityLevel } from '../types/stream';
import { getThumbnailUrlWithFallback, createPlaceholderThumbnail } from '../utils/thumbnails';
import { formatSuiAmount } from '../lib/sui';

// Demo streams for each category
const DEMO_STREAMS_BY_CATEGORY: Record<string, Stream[]> = {
  gaming: [
    {
      id: 'gaming_1',
      creator: '0x1234...5678',
      title: 'Epic Gaming Marathon - 24 Hours of Sui Games',
      description: 'Playing the latest games built on Sui blockchain',
      category: 'Gaming',
      thumbnailWalrusId: '', // Empty for placeholder
      hlsManifestWalrusId: 'manifest_gaming_1',
      status: StreamStatus.LIVE,
      createdAt: Date.now() - 7200000,
      startedAt: Date.now() - 3600000,
      endedAt: 0,
      viewerCount: 3421,
      totalRevenue: 45000000000,
      qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
      isMonetized: true,
      subscriptionPrice: 5000000000,
      tipEnabled: true,
      moderationScore: 98,
      contentRating: 'Teen',
      tags: ['gaming', 'sui', 'marathon', 'blockchain'],
      metadataBlobId: 'meta_gaming_1',
      streamKey: 'sk_gaming_1',
      rtmpUrl: 'rtmp://demo.streamguard.io/live/sk_gaming_1',
    },
    {
      id: 'gaming_2',
      creator: '0x9876...1234',
      title: 'Speedrun Challenge - Breaking Records Live',
      description: 'Attempting world record speedruns in classic games',
      category: 'Gaming',
      thumbnailWalrusId: '', // Empty for placeholder
      hlsManifestWalrusId: 'manifest_gaming_2',
      status: StreamStatus.LIVE,
      createdAt: Date.now() - 5400000,
      startedAt: Date.now() - 2700000,
      endedAt: 0,
      viewerCount: 1892,
      totalRevenue: 28000000000,
      qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
      isMonetized: true,
      subscriptionPrice: 3000000000,
      tipEnabled: true,
      moderationScore: 95,
      contentRating: 'General',
      tags: ['speedrun', 'gaming', 'challenge', 'records'],
      metadataBlobId: 'meta_gaming_2',
      streamKey: 'sk_gaming_2',
      rtmpUrl: 'rtmp://demo.streamguard.io/live/sk_gaming_2',
    },
  ],
  technology: [
    {
      id: 'tech_1',
      creator: '0x1234...5678',
      title: 'Building DeFi on Sui - Live Coding Session',
      description: 'Join me as I build a decentralized exchange on Sui blockchain',
      category: 'Technology',
      thumbnailWalrusId: '', // Empty for placeholder
      hlsManifestWalrusId: 'manifest_tech_1',
      status: StreamStatus.LIVE,
      createdAt: Date.now() - 3600000,
      startedAt: Date.now() - 1800000,
      endedAt: 0,
      viewerCount: 1247,
      totalRevenue: 15000000000,
      qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
      isMonetized: true,
      subscriptionPrice: 10000000000,
      tipEnabled: true,
      moderationScore: 95,
      contentRating: 'General',
      tags: ['sui', 'defi', 'coding', 'blockchain'],
      metadataBlobId: 'meta_tech_1',
      streamKey: 'sk_tech_1',
      rtmpUrl: 'rtmp://demo.streamguard.io/live/sk_tech_1',
    },
  ],
  education: [
    {
      id: 'edu_1',
      creator: '0x5555...7777',
      title: 'Learn Sui Move Programming - Beginner Friendly',
      description: 'Complete tutorial series for Move smart contract development',
      category: 'Education',
      thumbnailWalrusId: '', // Empty for placeholder
      hlsManifestWalrusId: 'manifest_edu_1',
      status: StreamStatus.LIVE,
      createdAt: Date.now() - 1800000,
      startedAt: Date.now() - 900000,
      endedAt: 0,
      viewerCount: 892,
      totalRevenue: 8000000000,
      qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
      isMonetized: true,
      subscriptionPrice: 15000000000,
      tipEnabled: true,
      moderationScore: 100,
      contentRating: 'General',
      tags: ['education', 'move', 'programming', 'tutorial'],
      metadataBlobId: 'meta_edu_1',
      streamKey: 'sk_edu_1',
      rtmpUrl: 'rtmp://demo.streamguard.io/live/sk_edu_1',
    },
  ],
};

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

const CategoryPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const { streams, getLiveStreams } = useStreamStore();
  const [categoryStreams, setCategoryStreams] = useState<Stream[]>([]);

  useEffect(() => {
    if (!category) return;

    // Get real streams from store
    const realStreams = getLiveStreams().filter(
      stream => stream.category.toLowerCase() === category.toLowerCase()
    );

    // Get demo streams for this category
    const demoStreams = DEMO_STREAMS_BY_CATEGORY[category.toLowerCase()] || [];

    // Combine real and demo streams
    const allStreams = [...realStreams, ...demoStreams];
    setCategoryStreams(allStreams);
  }, [category, streams, getLiveStreams]);

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Category not found</div>
      </div>
    );
  }

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const liveStreams = categoryStreams.filter(stream => stream.status === StreamStatus.LIVE);
  const totalViewers = liveStreams.reduce((sum, stream) => sum + stream.viewerCount, 0);
  const totalRevenue = liveStreams.reduce((sum, stream) => sum + stream.totalRevenue, 0);

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/">
              <Button variant="outline" className="border-gray-600 text-gray-300">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{categoryName} Streams</h1>
              <p className="text-gray-400">
                Discover live {categoryName.toLowerCase()} content on StreamGuard
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">{liveStreams.length}</div>
              <div className="text-gray-400 text-sm">Live Streams</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gray-800 border-gray-700 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {totalViewers.toLocaleString()}
            </div>
            <div className="text-gray-400">Total Viewers</div>
          </Card>
          
          <Card className="p-6 bg-gray-800 border-gray-700 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {formatSuiAmount(totalRevenue)} SUI
            </div>
            <div className="text-gray-400">Total Revenue</div>
          </Card>
          
          <Card className="p-6 bg-gray-800 border-gray-700 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {Math.round(liveStreams.reduce((sum, stream) => sum + stream.moderationScore, 0) / Math.max(liveStreams.length, 1))}%
            </div>
            <div className="text-gray-400">Avg. Quality Score</div>
          </Card>
        </div>

        {/* Streams Grid */}
        {liveStreams.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">🔴 Live Now</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {liveStreams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-12 text-center bg-gray-800 border-gray-700">
            <div className="text-6xl mb-4">📺</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Live {categoryName} Streams
            </h3>
            <p className="text-gray-400 mb-6">
              Be the first to stream {categoryName.toLowerCase()} content on StreamGuard!
            </p>
            <Link to="/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Start Streaming
              </Button>
            </Link>
          </Card>
        )}

        {/* Category Description */}
        <Card className="mt-12 p-8 bg-gray-800 border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">About {categoryName} on StreamGuard</h3>
          <p className="text-gray-300 leading-relaxed">
            {category === 'gaming' && 
              "Discover the latest gaming content on StreamGuard. From competitive esports to casual gameplay, our gaming streamers showcase the best of blockchain gaming and traditional titles. Join the community and support your favorite gamers with SUI tokens."
            }
            {category === 'technology' && 
              "Explore cutting-edge technology content including blockchain development, coding tutorials, and tech reviews. Learn from expert developers building on Sui and other innovative platforms."
            }
            {category === 'education' && 
              "Access high-quality educational content covering programming, blockchain technology, and more. Our educators provide comprehensive tutorials and courses to help you learn and grow."
            }
            {!['gaming', 'technology', 'education'].includes(category) && 
              `Discover amazing ${categoryName.toLowerCase()} content from talented creators on StreamGuard. Support your favorite streamers with tips and subscriptions using SUI tokens.`
            }
          </p>
        </Card>
      </div>
    </div>
  );
};

export default CategoryPage; 
import React, { useEffect, useState } from 'react';
import { Stream, StreamStatus, QualityLevel } from '../../types/stream';
import { useLiveStreams, useStreamStore } from '../../stores/streamStore';
import { walrusService } from '../../lib/walrus';
import { getThumbnailUrl } from '../../utils/thumbnails';

interface StreamListProps {
  category?: string;
  limit?: number;
  showFeatured?: boolean;
  onStreamSelect?: (stream: Stream) => void;
}

export const StreamList: React.FC<StreamListProps> = ({
  category,
  limit,
  showFeatured = false,
  onStreamSelect,
}) => {
  const liveStreams = useLiveStreams();
  const { setCurrentStream, joinStream } = useStreamStore();
  const [filteredStreams, setFilteredStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let streams = liveStreams;

    // Filter by category if specified
    if (category) {
      streams = streams.filter(stream => stream.category === category);
    }

    // Limit results if specified
    if (limit) {
      streams = streams.slice(0, limit);
    }

    // Sort by viewer count (descending)
    streams = streams.sort((a, b) => b.viewerCount - a.viewerCount);

    setFilteredStreams(streams);
    setLoading(false);
  }, [liveStreams, category, limit]);

  const handleStreamClick = async (stream: Stream) => {
    try {
      setCurrentStream(stream);
      onStreamSelect?.(stream);
      
      // Join the stream (this will handle payment if required)
      await joinStream(stream.id);
    } catch (error) {
      console.error('Failed to join stream:', error);
    }
  };

  const formatViewerCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getQualityBadge = (qualityLevels: QualityLevel[]): string => {
    const maxQuality = Math.max(...qualityLevels);
    switch (maxQuality) {
      case QualityLevel.QUALITY_4K: return '4K';
      case QualityLevel.QUALITY_1080P: return 'HD';
      case QualityLevel.QUALITY_720P: return '720p';
      case QualityLevel.QUALITY_480P: return '480p';
      default: return 'SD';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <StreamCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (filteredStreams.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">
          {category ? `No live streams in ${category}` : 'No live streams available'}
        </div>
        <div className="text-gray-500 text-sm">
          Check back later or explore other categories
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredStreams.map((stream) => (
        <StreamCard
          key={stream.id}
          stream={stream}
          onClick={() => handleStreamClick(stream)}
        />
      ))}
    </div>
  );
};

interface StreamCardProps {
  stream: Stream;
  onClick: () => void;
}

const StreamCard: React.FC<StreamCardProps> = ({ stream, onClick }) => {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formatDuration = (startTime: number): string => {
    const duration = Date.now() - startTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatViewerCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getQualityBadge = (qualityLevels: QualityLevel[]): string => {
    const maxQuality = Math.max(...qualityLevels);
    switch (maxQuality) {
      case QualityLevel.QUALITY_4K: return '4K';
      case QualityLevel.QUALITY_1080P: return 'HD';
      case QualityLevel.QUALITY_720P: return '720p';
      case QualityLevel.QUALITY_480P: return '480p';
      default: return 'SD';
    }
  };

  const getStreamThumbnailUrl = (stream: Stream): string => {
    return getThumbnailUrl(stream.thumbnailWalrusId, {
      streamId: stream.id,
      title: stream.title,
      category: stream.category
    });
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isHovered ? 'transform scale-105 shadow-xl' : 'shadow-lg'
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-700">
        <img
          src={getStreamThumbnailUrl(stream)}
          alt={stream.title}
          className="w-full h-full object-cover"
          onError={() => setThumbnailError(true)}
        />
        
        {/* Live indicator */}
        <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
          ● LIVE
        </div>
        
        {/* Quality badge */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          {getQualityBadge(stream.qualityLevels)}
        </div>
        
        {/* Duration */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          {formatDuration(stream.startedAt)}
        </div>
        
        {/* Viewer count */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          👁 {formatViewerCount(stream.viewerCount)}
        </div>
        
        {/* Monetization indicator */}
        {stream.isMonetized && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-2 py-1 rounded text-xs">
            💰 Premium
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
          {stream.title}
        </h3>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">
            {stream.creator.slice(0, 8)}...{stream.creator.slice(-4)}
          </span>
          <span className="text-blue-400 text-sm bg-blue-900 bg-opacity-30 px-2 py-1 rounded">
            {stream.category}
          </span>
        </div>
        
        {stream.description && (
          <p className="text-gray-300 text-sm line-clamp-2 mb-3">
            {stream.description}
          </p>
        )}
        
        {/* Tags */}
        {stream.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
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
                +{stream.tags.length - 3} more
              </span>
            )}
          </div>
        )}
        
        {/* Revenue info for monetized streams */}
        {stream.isMonetized && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Subscription: {(stream.subscriptionPrice / 1000000000).toFixed(3)} SUI
            </span>
            {stream.tipEnabled && (
              <span className="text-green-400">💝 Tips enabled</span>
            )}
          </div>
        )}
        
        {/* Moderation score */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              stream.moderationScore >= 80 ? 'bg-green-500' :
              stream.moderationScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-400">
              Safety: {stream.moderationScore}/100
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {stream.contentRating}
          </span>
        </div>
      </div>
    </div>
  );
};

const StreamCardSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-700" />
      <div className="p-4">
        <div className="h-6 bg-gray-700 rounded mb-2" />
        <div className="flex justify-between mb-2">
          <div className="h-4 bg-gray-700 rounded w-20" />
          <div className="h-4 bg-gray-700 rounded w-16" />
        </div>
        <div className="h-4 bg-gray-700 rounded mb-2" />
        <div className="h-4 bg-gray-700 rounded w-3/4" />
      </div>
    </div>
  );
};

export default StreamList; 
import React from 'react';
import { Link } from 'react-router-dom';
import { Stream, StreamStatus, QualityLevel } from '../../types/stream';
import { formatSuiAmount } from '../../lib/sui';
import { getThumbnailUrlWithFallback } from '../../utils/thumbnails';
import { useStreamStore } from '../../stores/streamStore';
import { Users, Play } from 'lucide-react';

interface StreamListProps {
  category?: string;
  searchQuery?: string;
  limit?: number;
}

const StreamList: React.FC<StreamListProps> = ({ category, searchQuery, limit }) => {
  const { getLiveStreams, setCurrentStream } = useStreamStore();
  
  // Get live streams
  const liveStreams = getLiveStreams();

  // Filter streams based on category and search
  let filteredStreams = liveStreams;

  if (category && category !== 'All') {
    filteredStreams = filteredStreams.filter((stream: Stream) => stream.category === category);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredStreams = filteredStreams.filter((stream: Stream) =>
      stream.title.toLowerCase().includes(query) ||
      stream.description.toLowerCase().includes(query) ||
      stream.tags.some((tag: string) => tag.toLowerCase().includes(query))
    );
  }

  // Sort by viewer count
  filteredStreams = filteredStreams.sort((a: Stream, b: Stream) => b.viewerCount - a.viewerCount);

  // Apply limit if specified
  if (limit) {
    filteredStreams = filteredStreams.slice(0, limit);
  }

  const getQualityBadge = (qualityLevels: QualityLevel[]) => {
    if (!qualityLevels || qualityLevels.length === 0) return 'SD';
    
    const qualityOrder = {
      [QualityLevel.QUALITY_360P]: 1,
      [QualityLevel.QUALITY_480P]: 2,
      [QualityLevel.QUALITY_720P]: 3,
      [QualityLevel.QUALITY_1080P]: 4,
      [QualityLevel.QUALITY_1440P]: 5,
      [QualityLevel.QUALITY_4K]: 6,
    };

    const maxQuality = qualityLevels.reduce((max, current) => {
      return qualityOrder[current] > qualityOrder[max] ? current : max;
    });

    switch (maxQuality) {
      case QualityLevel.QUALITY_4K: return '4K';
      case QualityLevel.QUALITY_1440P: return '1440p';
      case QualityLevel.QUALITY_1080P: return 'HD';
      case QualityLevel.QUALITY_720P: return '720p';
      case QualityLevel.QUALITY_480P: return '480p';
      default: return 'SD';
    }
  };

  const handleStreamClick = (stream: Stream) => {
    setCurrentStream(stream);
  };

  if (filteredStreams.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">No streams found</div>
        <p className="text-gray-500">
          {category && category !== 'All' 
            ? `No ${category.toLowerCase()} streams are currently live.`
            : searchQuery
            ? 'Try adjusting your search terms.'
            : 'No live streams at the moment. Check back later!'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredStreams.map((stream: Stream) => (
        <Link
          key={stream.id}
          to={`/stream/${stream.id}`}
          onClick={() => handleStreamClick(stream)}
          className="group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors duration-200"
        >
          <div className="relative aspect-video">
            <img
              src={getThumbnailUrlWithFallback(stream.thumbnailWalrusId, stream.title, stream.category, true)}
              alt={stream.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://picsum.photos/320/180?random=${stream.id}`;
              }}
            />
            
            {/* Live indicator */}
            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
              LIVE
            </div>
            
            {/* Quality badge */}
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {getQualityBadge(stream.qualityLevels)}
            </div>
            
            {/* Viewer count */}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{stream.viewerCount.toLocaleString()}</span>
            </div>

            {/* Play overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
              <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
          
          <div className="p-4">
            <h3 className="text-white font-semibold mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
              {stream.title}
            </h3>
            
            <p className="text-gray-400 text-sm mb-2 line-clamp-1">
              {stream.creator.slice(0, 6)}...{stream.creator.slice(-4)}
            </p>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="bg-gray-700 px-2 py-1 rounded">{stream.category}</span>
              
              {stream.isMonetized && (
                <span className="text-green-400 flex items-center space-x-1">
                  <span>💰</span>
                  <span>{formatSuiAmount(stream.totalRevenue)} SUI</span>
                </span>
              )}
            </div>
            
            {/* Tags */}
            {stream.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {stream.tags.slice(0, 3).map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
                {stream.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{stream.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default StreamList; 
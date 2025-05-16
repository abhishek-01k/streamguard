import React, { useEffect, useRef, useState, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { StreamPlayerConfig, QualityLevel } from '../../types/stream';
import { walrusService } from '../../lib/walrus';
import { useStreamStore } from '../../stores/streamStore';

// Video.js player type
type VideoJSPlayer = ReturnType<typeof videojs>;

interface StreamPlayerProps extends StreamPlayerConfig {
  className?: string;
  width?: number;
  height?: number;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  streamId,
  walrusManifestId,
  autoplay = false,
  controls = true,
  muted = false,
  poster,
  qualityLevels = [QualityLevel.QUALITY_720P],
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  className = '',
  width = 854,
  height = 480,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoJSPlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manifestUrl, setManifestUrl] = useState<string>('');
  
  const { updateHeartbeat, currentSession } = useStreamStore();

  // Initialize Video.js player
  const initializePlayer = useCallback(async () => {
    if (!videoRef.current || !walrusManifestId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get the HLS manifest URL from Walrus
      const manifestUrl = walrusService.getBlobUrl(walrusManifestId);
      setManifestUrl(manifestUrl);

      // Video.js configuration
      const options = {
        autoplay,
        controls,
        muted,
        poster,
        width,
        height,
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        sources: [{
          src: manifestUrl,
          type: 'application/x-mpegURL', // HLS MIME type
        }],
        html5: {
          hls: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: true,
          },
        },
        plugins: {
          // Add quality selector plugin
          qualitySelector: {
            default: 'auto',
          },
        },
      };

      // Initialize player
      const player = videojs(videoRef.current, options);
      playerRef.current = player;

      // Player event handlers
      player.ready(() => {
        setIsLoading(false);
        onReady?.(player);
      });

      player.on('play', () => {
        onPlay?.();
      });

      player.on('pause', () => {
        onPause?.();
      });

      player.on('ended', () => {
        onEnded?.();
      });

      player.on('error', (event: any) => {
        const error = player.error();
        const errorMessage = error ? `Video error: ${error.message}` : 'Unknown video error';
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      });

      // Quality change handler
      player.on('qualitychange', (event: any) => {
        const quality = event.quality;
        if (quality && currentSession) {
          updateHeartbeat(quality.level || QualityLevel.QUALITY_720P);
        }
      });

      // Heartbeat for analytics (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        if (player && !player.paused() && currentSession) {
          const currentQuality = getCurrentQuality(player);
          updateHeartbeat(currentQuality);
        }
      }, 30000);

      // Cleanup interval on component unmount
      return () => {
        clearInterval(heartbeatInterval);
      };

    } catch (error) {
      console.error('Failed to initialize player:', error);
      setError(`Failed to load stream: ${(error as Error).message}`);
      setIsLoading(false);
    }
  }, [
    walrusManifestId,
    autoplay,
    controls,
    muted,
    poster,
    width,
    height,
    onReady,
    onPlay,
    onPause,
    onEnded,
    onError,
    updateHeartbeat,
    currentSession,
  ]);

  // Get current quality level from player
  const getCurrentQuality = (player: VideoJSPlayer): QualityLevel => {
    try {
      const tech = player.tech();
      if (tech && (tech as any).hls) {
        const currentLevel = (tech as any).hls.currentLevel;
        return mapHLSLevelToQuality(currentLevel);
      }
    } catch (error) {
      console.warn('Could not get current quality:', error);
    }
    return QualityLevel.QUALITY_720P; // Default fallback
  };

  // Map HLS level to our quality enum
  const mapHLSLevelToQuality = (level: number): QualityLevel => {
    switch (level) {
      case 0: return QualityLevel.QUALITY_240P;
      case 1: return QualityLevel.QUALITY_480P;
      case 2: return QualityLevel.QUALITY_720P;
      case 3: return QualityLevel.QUALITY_1080P;
      case 4: return QualityLevel.QUALITY_4K;
      default: return QualityLevel.QUALITY_720P;
    }
  };

  // Initialize player when component mounts or manifest changes
  useEffect(() => {
    const cleanup = initializePlayer();
    
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
      
      // Dispose of Video.js player
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [initializePlayer]);

  // Player control methods
  const play = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.play();
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (playerRef.current) {
      playerRef.current.volume(Math.max(0, Math.min(1, volume)));
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime(time);
    }
  }, []);

  const setQuality = useCallback((quality: QualityLevel) => {
    if (playerRef.current) {
      const tech = playerRef.current.tech();
      if (tech && (tech as any).hls) {
        (tech as any).hls.currentLevel = quality;
      }
    }
  }, []);

  if (error) {
    return (
      <div className={`stream-player-error ${className}`} style={{ width, height }}>
        <div className="flex items-center justify-center h-full bg-gray-900 text-white rounded-lg">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-2">⚠️</div>
            <div className="text-lg font-semibold mb-2">Playback Error</div>
            <div className="text-sm text-gray-300">{error}</div>
            <button
              onClick={() => initializePlayer()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`stream-player-container ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <div className="text-lg">Loading stream...</div>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="video-js vjs-default-skin w-full h-full"
        data-setup="{}"
        playsInline
      />
      
      {/* Stream info overlay */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
        Stream ID: {streamId}
      </div>
      
      {/* Quality indicator */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
        {manifestUrl && (
          <span className="text-green-400">● LIVE</span>
        )}
      </div>
    </div>
  );
};

// Quality selector component
interface QualitySelectorProps {
  currentQuality: QualityLevel;
  availableQualities: QualityLevel[];
  onQualityChange: (quality: QualityLevel) => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  currentQuality,
  availableQualities,
  onQualityChange,
}) => {
  const getQualityLabel = (quality: QualityLevel): string => {
    switch (quality) {
      case QualityLevel.QUALITY_240P: return '240p';
      case QualityLevel.QUALITY_480P: return '480p';
      case QualityLevel.QUALITY_720P: return '720p';
      case QualityLevel.QUALITY_1080P: return '1080p';
      case QualityLevel.QUALITY_4K: return '4K';
      default: return 'Auto';
    }
  };

  return (
    <div className="quality-selector">
      <select
        value={currentQuality}
        onChange={(e) => onQualityChange(Number(e.target.value) as QualityLevel)}
        className="bg-black bg-opacity-50 text-white border border-gray-600 rounded px-2 py-1 text-sm"
      >
        {availableQualities.map((quality) => (
          <option key={quality} value={quality}>
            {getQualityLabel(quality)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StreamPlayer; 
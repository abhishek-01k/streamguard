import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';

interface StreamPlayerProps {
  manifestUrl: string;
  title: string;
  isLive: boolean;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  manifestUrl,
  title,
  isLive,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Clear any existing error state
    setError(null);

    // Prevent double initialization
    if (playerRef.current) {
      console.log('🎥 Player already exists, updating source...');
      
      try {
        // Update the source instead of reinitializing
        if (isLive && manifestUrl) {
          console.log('🎥 Updating live stream source:', manifestUrl);
          playerRef.current.src({
            src: manifestUrl,
            type: 'application/x-mpegURL',
          });
        } else if (isLive && !manifestUrl) {
          console.log('⚠️ Live stream has no manifest URL - showing placeholder');
          setError('This is a demo stream. Video content would be streamed from Walrus in production.');
        } else {
          console.log('📺 Updating demo HLS stream');
          playerRef.current.src({
            src: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
            type: 'application/x-mpegURL',
          });
        }
      } catch (error) {
        console.error('Error updating player source:', error);
        setError('Failed to update video source');
      }
      return;
    }

    console.log('🎥 Initializing new Video.js player...');

    // Ensure the video element is properly set up
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Make sure the element is in the DOM and properly configured
    videoElement.className = 'video-js vjs-default-skin';
    videoElement.setAttribute('playsinline', 'true');
    videoElement.setAttribute('data-setup', '{}');

    // Initialize Video.js player with error handling
    let player: any;
    try {
      player = videojs(videoElement, {
        controls: true,
        responsive: true,
        fluid: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        liveui: isLive, // Enable live UI for live streams
        plugins: {
          // Add quality selector if available
        },
        html5: {
          hls: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: true,
          },
        },
      });

      playerRef.current = player;

      // Set up event listeners with error handling
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleVolumeChange = () => {
        try {
          const currentVolume = player.volume();
          const currentMuted = player.muted();
          if (typeof currentVolume === 'number') {
            setVolume(currentVolume);
          }
          if (typeof currentMuted === 'boolean') {
            setIsMuted(currentMuted);
          }
        } catch (error) {
          console.warn('Error handling volume change:', error);
        }
      };
      const handleFullscreenChange = () => {
        try {
          const currentFullscreen = player.isFullscreen();
          if (typeof currentFullscreen === 'boolean') {
            setIsFullscreen(currentFullscreen);
          }
        } catch (error) {
          console.warn('Error handling fullscreen change:', error);
        }
      };
      const handleError = (e: any) => {
        console.error('Video player error:', e);
        try {
          const error = player.error();
          if (error?.code === 4) {
            // Network error - likely the manifest doesn't exist
            setError('Stream content not available. This may be a demo stream or the content is still being uploaded to Walrus.');
          } else if (error?.code === 3) {
            // Decode error
            setError('Video format not supported or corrupted stream.');
          } else {
            setError('Failed to load stream. Please try again.');
          }
        } catch (err) {
          console.error('Error handling video error:', err);
          setError('Video player encountered an error');
        }
      };

      // Add event listeners
      player.on('play', handlePlay);
      player.on('pause', handlePause);
      player.on('volumechange', handleVolumeChange);
      player.on('fullscreenchange', handleFullscreenChange);
      player.on('error', handleError);

      // Load the stream
      if (isLive && manifestUrl) {
        console.log('🎥 Loading live stream from Walrus:', manifestUrl);
        // For live streams, use HLS manifest from Walrus
        player.src({
          src: manifestUrl,
          type: 'application/x-mpegURL',
        });
      } else if (isLive && !manifestUrl) {
        console.log('⚠️ Live stream has no manifest URL - showing placeholder');
        // For live streams without manifest URL (demo/development)
        setError('This is a demo stream. Video content would be streamed from Walrus in production.');
        return;
      } else {
        console.log('📺 Loading demo HLS stream');
        // For demo purposes, use a test HLS stream
        player.src({
          src: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
          type: 'application/x-mpegURL',
        });
      }

      // Auto-play for live streams (muted to comply with browser policies)
      if (isLive && manifestUrl) {
        player.muted(true);
        setIsMuted(true);
        player.play()?.catch((error: any) => {
          console.log('Auto-play failed:', error);
        });
      }

    } catch (initError) {
      console.error('Failed to initialize Video.js player:', initError);
      setError('Failed to initialize video player');
      return;
    }

    return () => {
      console.log('🎥 Cleaning up Video.js player...');
      if (playerRef.current) {
        try {
          // Remove event listeners before disposing
          playerRef.current.off();
          
          // Check if player is still valid before disposing
          if (typeof playerRef.current.dispose === 'function') {
            playerRef.current.dispose();
          }
        } catch (error) {
          console.warn('Error disposing player:', error);
        } finally {
          playerRef.current = null;
        }
      }
    };
  }, [manifestUrl, isLive, title]); // Added title to dependencies to trigger re-render when stream changes

  const togglePlay = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    
    playerRef.current.muted(!isMuted);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!playerRef.current) return;
    
    playerRef.current.volume(newVolume);
    if (newVolume === 0) {
      playerRef.current.muted(true);
    } else if (isMuted) {
      playerRef.current.muted(false);
    }
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    
    if (isFullscreen) {
      playerRef.current.exitFullscreen();
    } else {
      playerRef.current.requestFullscreen();
    }
  };

  if (error) {
    const isDemoError = error.includes('demo stream');
    
    return (
      <div className="relative w-full aspect-video bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <div className="text-6xl mb-4">{isDemoError ? '🎬' : '⚠️'}</div>
          <h3 className="text-xl font-semibold mb-2">
            {isDemoError ? 'Demo Stream' : 'Stream Unavailable'}
          </h3>
          <p className="text-gray-400 mb-4">{error}</p>
          {isDemoError ? (
            <div className="bg-blue-900 bg-opacity-50 p-4 rounded-lg text-sm">
              <p className="text-blue-300 mb-2">
                <strong>🔧 Development Mode:</strong>
              </p>
              <p className="text-blue-200">
                In production, this would stream live video content stored on Walrus decentralized storage.
                Connect OBS to the RTMP server to see the streaming setup in action.
              </p>
            </div>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black group">
      {/* Video Element */}
      <video
        ref={videoRef}
        className="video-js vjs-default-skin w-full h-full"
        data-setup="{}"
        playsInline
      />

      {/* Live Indicator */}
      {isLive && (
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>LIVE</span>
          </div>
        </div>
      )}

      {/* Stream Title */}
      <div className="absolute top-4 right-4 z-10 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm max-w-xs truncate">
        {title}
      </div>

      {/* Custom Controls Overlay (hidden when Video.js controls are visible) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center space-x-4">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-blue-400 transition-colors"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          {/* Volume */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Quality Selector (placeholder) */}
          <button className="text-white hover:text-blue-400 transition-colors">
            <Settings size={20} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-blue-400 transition-colors"
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>

      {/* Loading Spinner */}
      {!isPlaying && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Click to Play Overlay */}
      {!isPlaying && !error && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-blue-600 bg-opacity-80 rounded-full p-6 hover:bg-opacity-100 transition-all">
            <Play size={48} className="text-white fill-current" />
          </div>
        </div>
      )}
    </div>
  );
}; 
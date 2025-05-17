import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { 
  Stream, 
  StreamConfig, 
  ViewerSession, 
  StreamAnalytics, 
  StreamStatus,
  QualityLevel,
  CreatorDashboardData,
  ViewerDashboardData 
} from '../types/stream';

interface StreamState {
  // Current streams
  streams: Record<string, Stream>;
  liveStreams: Stream[];
  featuredStreams: Stream[];
  
  // Current user session
  currentSession: ViewerSession | null;
  currentStream: Stream | null;
  
  // Creator data
  creatorDashboard: CreatorDashboardData | null;
  
  // Viewer data
  viewerDashboard: ViewerDashboardData | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Real-time updates
  viewerCount: number;
  isConnected: boolean;
  
  // Actions
  setStreams: (streams: Stream[]) => void;
  addStream: (stream: Stream) => void;
  updateStream: (streamId: string, updates: Partial<Stream>) => void;
  removeStream: (streamId: string) => void;
  
  setCurrentStream: (stream: Stream | null) => void;
  setCurrentSession: (session: ViewerSession | null) => void;
  
  updateViewerCount: (streamId: string, count: number) => void;
  updateStreamStatus: (streamId: string, status: StreamStatus) => void;
  
  setCreatorDashboard: (data: CreatorDashboardData) => void;
  setViewerDashboard: (data: ViewerDashboardData) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnected: (connected: boolean) => void;
  
  // Stream management
  createStream: (config: StreamConfig) => Promise<Stream>;
  startStream: (streamId: string, hlsManifestId: string) => Promise<void>;
  endStream: (streamId: string) => Promise<void>;
  joinStream: (streamId: string, payment?: number) => Promise<ViewerSession>;
  leaveStream: () => void;
  sendTip: (streamId: string, amount: number, message: string) => Promise<void>;
  
  // Analytics
  updateHeartbeat: (qualityLevel: QualityLevel) => Promise<void>;
  getStreamAnalytics: (streamId: string) => Promise<StreamAnalytics>;
  
  // Cleanup
  reset: () => void;
}

export const useStreamStore = create<StreamState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      streams: {},
      liveStreams: [],
      featuredStreams: [],
      currentSession: null,
      currentStream: null,
      creatorDashboard: null,
      viewerDashboard: null,
      isLoading: false,
      error: null,
      viewerCount: 0,
      isConnected: false,

      // Basic setters
      setStreams: (streams) => set((state) => {
        const streamMap = streams.reduce((acc, stream) => {
          acc[stream.id] = stream;
          return acc;
        }, {} as Record<string, Stream>);
        
        const liveStreams = streams.filter(s => s.status === StreamStatus.LIVE);
        
        return {
          streams: streamMap,
          liveStreams,
        };
      }),

      addStream: (stream) => set((state) => ({
        streams: { ...state.streams, [stream.id]: stream },
        liveStreams: stream.status === StreamStatus.LIVE 
          ? [...state.liveStreams, stream]
          : state.liveStreams,
      })),

      updateStream: (streamId, updates) => set((state) => {
        const existingStream = state.streams[streamId];
        if (!existingStream) return state;

        const updatedStream = { ...existingStream, ...updates };
        const updatedStreams = { ...state.streams, [streamId]: updatedStream };
        
        // Update live streams if status changed
        let liveStreams = state.liveStreams;
        if (updates.status !== undefined) {
          liveStreams = Object.values(updatedStreams).filter(s => s.status === StreamStatus.LIVE);
        }

        return {
          streams: updatedStreams,
          liveStreams,
          currentStream: state.currentStream?.id === streamId ? updatedStream : state.currentStream,
        };
      }),

      removeStream: (streamId) => set((state) => {
        const { [streamId]: removed, ...remainingStreams } = state.streams;
        return {
          streams: remainingStreams,
          liveStreams: state.liveStreams.filter(s => s.id !== streamId),
          currentStream: state.currentStream?.id === streamId ? null : state.currentStream,
        };
      }),

      setCurrentStream: (stream) => set({ currentStream: stream }),
      setCurrentSession: (session) => set({ currentSession: session }),

      updateViewerCount: (streamId, count) => set((state) => {
        if (state.currentStream?.id === streamId) {
          return {
            currentStream: { ...state.currentStream, viewerCount: count },
            viewerCount: count,
          };
        }
        return { viewerCount: count };
      }),

      updateStreamStatus: (streamId, status) => set((state) => {
        const stream = state.streams[streamId];
        if (!stream) return state;

        const updatedStream = { ...stream, status };
        return {
          streams: { ...state.streams, [streamId]: updatedStream },
          liveStreams: status === StreamStatus.LIVE 
            ? [...state.liveStreams.filter(s => s.id !== streamId), updatedStream]
            : state.liveStreams.filter(s => s.id !== streamId),
          currentStream: state.currentStream?.id === streamId ? updatedStream : state.currentStream,
        };
      }),

      setCreatorDashboard: (data) => set({ creatorDashboard: data }),
      setViewerDashboard: (data) => set({ viewerDashboard: data }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setConnected: (connected) => set({ isConnected: connected }),

      // Stream management actions (these will be implemented with actual API calls)
      createStream: async (config) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement actual API call to create stream
          const mockStream: Stream = {
            id: `stream_${Date.now()}`,
            creator: 'current_user', // TODO: Get from wallet
            title: config.title,
            description: config.description,
            category: config.category,
            thumbnailWalrusId: config.thumbnailWalrusId,
            hlsManifestWalrusId: '',
            status: StreamStatus.CREATED,
            createdAt: Date.now(),
            startedAt: 0,
            endedAt: 0,
            viewerCount: 0,
            totalRevenue: 0,
            qualityLevels: config.qualityLevels,
            isMonetized: config.isMonetized,
            subscriptionPrice: config.subscriptionPrice,
            tipEnabled: config.tipEnabled,
            moderationScore: 100,
            contentRating: config.contentRating,
            tags: config.tags,
          };

          get().addStream(mockStream);
          set({ isLoading: false });
          return mockStream;
        } catch (error) {
          set({ isLoading: false, error: (error as Error).message });
          throw error;
        }
      },

      startStream: async (streamId, hlsManifestId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement actual API call to start stream
          get().updateStream(streamId, {
            status: StreamStatus.LIVE,
            startedAt: Date.now(),
            hlsManifestWalrusId: hlsManifestId,
          });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false, error: (error as Error).message });
          throw error;
        }
      },

      endStream: async (streamId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement actual API call to end stream
          get().updateStream(streamId, {
            status: StreamStatus.ENDED,
            endedAt: Date.now(),
          });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false, error: (error as Error).message });
          throw error;
        }
      },

      joinStream: async (streamId, payment) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement actual API call to join stream
          const mockSession: ViewerSession = {
            id: `session_${Date.now()}`,
            streamId,
            viewer: 'current_user', // TODO: Get from wallet
            startedAt: Date.now(),
            lastHeartbeat: Date.now(),
            totalWatchTime: 0,
            qualityLevel: QualityLevel.QUALITY_720P,
            hasPaid: !!payment,
            tipsSent: 0,
          };

          set({ currentSession: mockSession, isLoading: false });
          return mockSession;
        } catch (error) {
          set({ isLoading: false, error: (error as Error).message });
          throw error;
        }
      },

      leaveStream: () => {
        set({ currentSession: null, currentStream: null });
      },

      sendTip: async (streamId, amount, message) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement actual API call to send tip
          const session = get().currentSession;
          if (session) {
            set({
              currentSession: {
                ...session,
                tipsSent: session.tipsSent + amount,
              },
              isLoading: false,
            });
          }
        } catch (error) {
          set({ isLoading: false, error: (error as Error).message });
          throw error;
        }
      },

      updateHeartbeat: async (qualityLevel) => {
        const session = get().currentSession;
        if (!session) return;

        try {
          const now = Date.now();
          const timeDiff = now - session.lastHeartbeat;
          
          set({
            currentSession: {
              ...session,
              lastHeartbeat: now,
              totalWatchTime: session.totalWatchTime + timeDiff,
              qualityLevel,
            },
          });
        } catch (error) {
          console.error('Failed to update heartbeat:', error);
        }
      },

      getStreamAnalytics: async (streamId) => {
        // TODO: Implement actual API call to get analytics
        const mockAnalytics: StreamAnalytics = {
          id: `analytics_${streamId}`,
          streamId,
          totalViews: 1250,
          uniqueViewers: 890,
          peakConcurrentViewers: 156,
          totalWatchTime: 45000,
          averageWatchTime: 3600,
          revenueGenerated: 125000,
          tipsReceived: 25000,
          qualityDistribution: {
            [QualityLevel.QUALITY_240P]: 50,
            [QualityLevel.QUALITY_480P]: 150,
            [QualityLevel.QUALITY_720P]: 400,
            [QualityLevel.QUALITY_1080P]: 200,
            [QualityLevel.QUALITY_4K]: 90,
          },
          geographicData: {
            'US': 450,
            'EU': 300,
            'ASIA': 200,
            'OTHER': 140,
          },
        };
        return mockAnalytics;
      },

      reset: () => set({
        streams: {},
        liveStreams: [],
        featuredStreams: [],
        currentSession: null,
        currentStream: null,
        creatorDashboard: null,
        viewerDashboard: null,
        isLoading: false,
        error: null,
        viewerCount: 0,
        isConnected: false,
      }),
    })),
    {
      name: 'stream-store',
    }
  )
);

// Selectors for optimized re-renders
export const useCurrentStream = () => useStreamStore((state) => state.currentStream);
export const useCurrentSession = () => useStreamStore((state) => state.currentSession);
export const useLiveStreams = () => useStreamStore((state) => state.liveStreams);
export const useStreamLoading = () => useStreamStore((state) => state.isLoading);
export const useStreamError = () => useStreamStore((state) => state.error); 
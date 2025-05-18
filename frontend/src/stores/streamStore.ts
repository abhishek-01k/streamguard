import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stream, StreamStatus, CreatorProfile, ChatMessage, StreamMetrics } from '../types/stream';

interface StreamStore {
  // Streams
  streams: Stream[];
  currentStream: Stream | null;
  
  // Creator profiles
  creatorProfiles: Record<string, CreatorProfile>;
  
  // Chat
  chatMessages: ChatMessage[];
  
  // Metrics
  streamMetrics: StreamMetrics | null;
  
  // Actions
  addStream: (stream: Stream) => void;
  updateStream: (streamId: string, updates: Partial<Stream>) => void;
  setCurrentStream: (stream: Stream | null) => void;
  removeStream: (streamId: string) => void;
  
  // Creator profile actions
  setCreatorProfile: (profile: CreatorProfile) => void;
  updateCreatorProfile: (address: string, updates: Partial<CreatorProfile>) => void;
  
  // Chat actions
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  
  // Metrics actions
  setStreamMetrics: (metrics: StreamMetrics) => void;
  updateViewerCount: (count: number) => void;
  
  // Utility actions
  getStreamsByCreator: (creatorAddress: string) => Stream[];
  getLiveStreams: () => Stream[];
  getStreamById: (streamId: string) => Stream | undefined;
}

export const useStreamStore = create<StreamStore>()(
  persist(
    (set, get) => ({
      // Initial state
      streams: [],
      currentStream: null,
      creatorProfiles: {},
      chatMessages: [],
      streamMetrics: null,
      
      // Stream actions
      addStream: (stream) =>
        set((state) => ({
          streams: [...state.streams, stream],
        })),
      
      updateStream: (streamId, updates) =>
        set((state) => ({
          streams: state.streams.map((stream) =>
            stream.id === streamId ? { ...stream, ...updates } : stream
          ),
          currentStream:
            state.currentStream?.id === streamId
              ? { ...state.currentStream, ...updates }
              : state.currentStream,
        })),
      
      setCurrentStream: (stream) =>
        set(() => ({
          currentStream: stream,
        })),
      
      removeStream: (streamId) =>
        set((state) => ({
          streams: state.streams.filter((stream) => stream.id !== streamId),
          currentStream:
            state.currentStream?.id === streamId ? null : state.currentStream,
        })),
      
      // Creator profile actions
      setCreatorProfile: (profile) =>
        set((state) => ({
          creatorProfiles: {
            ...state.creatorProfiles,
            [profile.address]: profile,
          },
        })),
      
      updateCreatorProfile: (address, updates) =>
        set((state) => ({
          creatorProfiles: {
            ...state.creatorProfiles,
            [address]: {
              ...state.creatorProfiles[address],
              ...updates,
            },
          },
        })),
      
      // Chat actions
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message].slice(-100), // Keep last 100 messages
        })),
      
      clearChatMessages: () =>
        set(() => ({
          chatMessages: [],
        })),
      
      // Metrics actions
      setStreamMetrics: (metrics) =>
        set(() => ({
          streamMetrics: metrics,
        })),
      
      updateViewerCount: (count) =>
        set((state) => ({
          streamMetrics: state.streamMetrics
            ? {
                ...state.streamMetrics,
                viewerCount: count,
                peakViewers: Math.max(state.streamMetrics.peakViewers, count),
              }
            : null,
        })),
      
      // Utility functions
      getStreamsByCreator: (creatorAddress) => {
        const { streams } = get();
        return streams.filter((stream) => stream.creator === creatorAddress);
      },
      
      getLiveStreams: () => {
        const { streams } = get();
        return streams.filter((stream) => stream.status === StreamStatus.LIVE);
      },
      
      getStreamById: (streamId) => {
        const { streams } = get();
        return streams.find((stream) => stream.id === streamId);
      },
    }),
    {
      name: 'streamguard-store',
      partialize: (state) => ({
        streams: state.streams,
        creatorProfiles: state.creatorProfiles,
      }),
    }
  )
); 
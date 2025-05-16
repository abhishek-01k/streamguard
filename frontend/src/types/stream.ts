export interface Stream {
  id: string;
  creator: string;
  title: string;
  description: string;
  category: string;
  thumbnailWalrusId: string;
  hlsManifestWalrusId: string;
  status: StreamStatus;
  createdAt: number;
  startedAt: number;
  endedAt: number;
  viewerCount: number;
  totalRevenue: number;
  qualityLevels: QualityLevel[];
  isMonetized: boolean;
  subscriptionPrice: number;
  tipEnabled: boolean;
  moderationScore: number;
  contentRating: string;
  tags: string[];
}

export interface StreamConfig {
  title: string;
  description: string;
  category: string;
  thumbnailWalrusId: string;
  qualityLevels: QualityLevel[];
  isMonetized: boolean;
  subscriptionPrice: number;
  tipEnabled: boolean;
  contentRating: string;
  tags: string[];
}

export interface ViewerSession {
  id: string;
  streamId: string;
  viewer: string;
  startedAt: number;
  lastHeartbeat: number;
  totalWatchTime: number;
  qualityLevel: QualityLevel;
  hasPaid: boolean;
  tipsSent: number;
}

export interface StreamAnalytics {
  id: string;
  streamId: string;
  totalViews: number;
  uniqueViewers: number;
  peakConcurrentViewers: number;
  totalWatchTime: number;
  averageWatchTime: number;
  revenueGenerated: number;
  tipsReceived: number;
  qualityDistribution: Record<QualityLevel, number>;
  geographicData: Record<string, number>;
}

export enum StreamStatus {
  CREATED = 0,
  LIVE = 1,
  ENDED = 2,
  ARCHIVED = 3,
}

export enum QualityLevel {
  QUALITY_240P = 0,
  QUALITY_480P = 1,
  QUALITY_720P = 2,
  QUALITY_1080P = 3,
  QUALITY_4K = 4,
}

export interface StreamEvent {
  streamId: string;
  creator: string;
  timestamp: number;
}

export interface StreamCreated extends StreamEvent {
  title: string;
  category: string;
}

export interface StreamStarted extends StreamEvent {}

export interface StreamEnded extends StreamEvent {
  duration: number;
  totalViewers: number;
  revenue: number;
}

export interface ViewerJoined extends StreamEvent {
  viewer: string;
}

export interface TipSent extends StreamEvent {
  from: string;
  to: string;
  amount: number;
  message: string;
}

export interface WalrusSegmentStored extends StreamEvent {
  segmentNumber: number;
  walrusBlobId: string;
}

export interface HLSManifest {
  version: number;
  targetDuration: number;
  sequence: number;
  segments: HLSSegment[];
}

export interface HLSSegment {
  duration: number;
  uri: string;
  walrusBlobId: string;
  timestamp: number;
}

export interface WalrusConfig {
  publisherUrl: string;
  aggregatorUrl: string;
  epochs: number;
}

export interface StreamPlayerConfig {
  streamId: string;
  walrusManifestId: string;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  poster?: string;
  qualityLevels?: QualityLevel[];
  onReady?: (player: any) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export interface CreatorDashboardData {
  totalStreams: number;
  totalRevenue: number;
  totalViewers: number;
  averageViewTime: number;
  topStreams: Stream[];
  recentAnalytics: StreamAnalytics[];
}

export interface ViewerDashboardData {
  watchHistory: ViewerSession[];
  favoriteStreams: Stream[];
  subscriptions: Stream[];
  totalWatchTime: number;
  totalTipsSent: number;
} 
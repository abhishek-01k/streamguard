// StreamGuard Type Definitions

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
  subscriptionPrice: number; // in MIST
  tipEnabled: boolean;
  moderationScore: number;
  contentRating: 'General' | 'Teen' | 'Mature';
  tags: string[];
  metadataBlobId: string;
  streamKey: string;
  rtmpUrl: string;
}

export enum StreamStatus {
  CREATED = 'created',
  LIVE = 'live',
  ENDED = 'ended',
  PAUSED = 'paused',
}

export enum QualityLevel {
  QUALITY_360P = '360p',
  QUALITY_480P = '480p',
  QUALITY_720P = '720p',
  QUALITY_1080P = '1080p',
  QUALITY_1440P = '1440p',
  QUALITY_4K = '4k',
}

export interface CreatorProfile {
  id: string;
  address: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followerCount: number;
  totalEarnings: number;
  subscriptionTiers: SubscriptionTier[];
  isVerified: boolean;
  createdAt: number;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number; // in MIST
  duration: number; // in milliseconds
  benefits: string[];
  isActive: boolean;
}

export interface Subscription {
  id: string;
  subscriber: string;
  creatorProfile: string;
  tierName: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
}

export interface Tip {
  id: string;
  sender: string;
  recipient: string;
  amount: number; // in MIST
  message: string;
  streamId?: string;
  timestamp: number;
}

export interface ContentNFT {
  id: string;
  creator: string;
  title: string;
  description: string;
  contentType: string;
  walrusBlobId: string;
  thumbnailUrl?: string;
  duration: number;
  royaltyBps: number;
  metadata: Record<string, string>;
  viewCount: number;
  totalEarnings: number;
  createdAt: number;
}

export interface ModerationResult {
  id: string;
  streamId: string;
  moderator: string;
  score: number;
  flags: string[];
  confidence: number;
  timestamp: number;
  isAppealed: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderName: string;
  message: string;
  timestamp: number;
  type: 'message' | 'tip' | 'subscription' | 'system';
  amount?: number; // for tips
  streamId?: string; // optional stream association
}

export interface StreamMetrics {
  viewerCount: number;
  peakViewers: number;
  totalViews: number;
  averageViewDuration: number;
  chatMessages: number;
  tips: number;
  subscriptions: number;
  revenue: number;
}

export interface WalrusBlob {
  blobId: string;
  size: number;
  contentType: string;
  uploadedAt: number;
}

export interface StreamSettings {
  quality: QualityLevel;
  bitrate: number;
  framerate: number;
  enableChat: boolean;
  enableTips: boolean;
  enableSubscriptions: boolean;
  moderationLevel: 'strict' | 'moderate' | 'relaxed';
} 
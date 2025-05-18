import { WALRUS_CONFIG } from '../constants/contracts';

// Walrus storage utilities for StreamGuard
export class WalrusStorage {
  private publisherUrl: string;
  private aggregatorUrl: string;
  private epochs: number;

  constructor() {
    this.publisherUrl = WALRUS_CONFIG.PUBLISHER_URL;
    this.aggregatorUrl = WALRUS_CONFIG.AGGREGATOR_URL;
    this.epochs = WALRUS_CONFIG.EPOCHS;
  }

  // Store a blob on Walrus
  async storeBlob(data: Uint8Array | File): Promise<string> {
    try {
      const formData = new FormData();
      
      if (data instanceof File) {
        formData.append('file', data);
      } else {
        const blob = new Blob([data]);
        formData.append('file', blob);
      }

      const response = await fetch(`${this.publisherUrl}/v1/blobs?epochs=${this.epochs}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to store blob: ${response.statusText}`);
      }

      const result = await response.json();
      return result.newlyCreated?.blobObject?.blobId || result.alreadyCertified?.blobId;
    } catch (error) {
      console.error('Error storing blob on Walrus:', error);
      throw error;
    }
  }

  // Retrieve a blob from Walrus
  async retrieveBlob(blobId: string): Promise<Uint8Array> {
    try {
      const response = await fetch(`${this.aggregatorUrl}/v1/blobs/${blobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve blob: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('Error retrieving blob from Walrus:', error);
      throw error;
    }
  }

  // Get blob URL for direct access
  getBlobUrl(blobId: string): string {
    return `${this.aggregatorUrl}/v1/${blobId}`;
  }

  // Store video segment for live streaming
  async storeVideoSegment(
    segment: Uint8Array,
    streamId: string,
    segmentIndex: number
  ): Promise<string> {
    try {
      const segmentBlob = new Blob([segment], { type: 'video/mp2t' });
      const file = new File([segmentBlob], `${streamId}_${segmentIndex}.ts`);
      
      return await this.storeBlob(file);
    } catch (error) {
      console.error('Error storing video segment:', error);
      throw error;
    }
  }

  // Store HLS manifest
  async storeManifest(manifest: string, streamId: string): Promise<string> {
    try {
      const manifestBlob = new Blob([manifest], { type: 'application/vnd.apple.mpegurl' });
      const file = new File([manifestBlob], `${streamId}.m3u8`);
      
      return await this.storeBlob(file);
    } catch (error) {
      console.error('Error storing manifest:', error);
      throw error;
    }
  }

  // Store thumbnail image
  async storeThumbnail(imageFile: File): Promise<string> {
    try {
      return await this.storeBlob(imageFile);
    } catch (error) {
      console.error('Error storing thumbnail:', error);
      throw error;
    }
  }

  // Create HLS manifest for live streaming
  createHLSManifest(segments: Array<{ blobId: string; duration: number }>): string {
    const manifest = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:10',
      '#EXT-X-MEDIA-SEQUENCE:0',
      ''
    ];

    segments.forEach((segment, index) => {
      manifest.push(`#EXTINF:${segment.duration.toFixed(3)},`);
      manifest.push(this.getBlobUrl(segment.blobId));
    });

    manifest.push('#EXT-X-ENDLIST');
    return manifest.join('\n');
  }

  // Update live manifest with new segment
  updateLiveManifest(
    existingManifest: string,
    newSegment: { blobId: string; duration: number }
  ): string {
    const lines = existingManifest.split('\n');
    const endListIndex = lines.findIndex(line => line === '#EXT-X-ENDLIST');
    
    if (endListIndex !== -1) {
      // Remove #EXT-X-ENDLIST for live stream
      lines.splice(endListIndex, 1);
    }

    // Add new segment
    lines.push(`#EXTINF:${newSegment.duration.toFixed(3)},`);
    lines.push(this.getBlobUrl(newSegment.blobId));

    return lines.join('\n');
  }

  // Store stream metadata
  async storeStreamMetadata(metadata: {
    title: string;
    description: string;
    category: string;
    creator: string;
    thumbnailBlobId?: string;
    duration?: number;
    quality?: string;
  }): Promise<string> {
    try {
      const metadataJson = JSON.stringify(metadata, null, 2);
      const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
      const file = new File([metadataBlob], 'metadata.json');
      
      return await this.storeBlob(file);
    } catch (error) {
      console.error('Error storing stream metadata:', error);
      throw error;
    }
  }

  // Retrieve stream metadata
  async retrieveStreamMetadata(metadataBlobId: string): Promise<any> {
    try {
      const data = await this.retrieveBlob(metadataBlobId);
      const jsonString = new TextDecoder().decode(data);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error retrieving stream metadata:', error);
      throw error;
    }
  }

  // Check if blob exists
  async blobExists(blobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.aggregatorUrl}/v1/${blobId}`, {
        method: 'HEAD'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get blob info
  async getBlobInfo(blobId: string): Promise<any> {
    try {
      const response = await fetch(`${this.aggregatorUrl}/v1/info/${blobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get blob info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting blob info:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const walrusStorage = new WalrusStorage();

// Utility functions for common operations
export async function uploadThumbnail(file: File): Promise<string> {
  return walrusStorage.storeThumbnail(file);
}

export async function uploadVideoFile(file: File): Promise<string> {
  return walrusStorage.storeBlob(file);
}

export function getVideoUrl(blobId: string): string {
  return walrusStorage.getBlobUrl(blobId);
}

export function getThumbnailUrl(blobId: string): string {
  return walrusStorage.getBlobUrl(blobId);
}

// Stream processing utilities
export class StreamProcessor {
  private walrus: WalrusStorage;
  private segments: Array<{ blobId: string; duration: number }> = [];

  constructor() {
    this.walrus = new WalrusStorage();
  }

  // Process video chunk for live streaming
  async processVideoChunk(
    chunk: Uint8Array,
    streamId: string,
    duration: number
  ): Promise<string> {
    const segmentIndex = this.segments.length;
    const blobId = await this.walrus.storeVideoSegment(chunk, streamId, segmentIndex);
    
    this.segments.push({ blobId, duration });
    
    // Keep only last 10 segments for live streaming
    if (this.segments.length > 10) {
      this.segments.shift();
    }

    return blobId;
  }

  // Generate current manifest
  getCurrentManifest(): string {
    return this.walrus.createHLSManifest(this.segments);
  }

  // Store final manifest for VOD
  async storeFinalManifest(streamId: string): Promise<string> {
    const manifest = this.walrus.createHLSManifest(this.segments);
    return this.walrus.storeManifest(manifest, streamId);
  }

  // Reset for new stream
  reset(): void {
    this.segments = [];
  }
}

export const streamProcessor = new StreamProcessor(); 
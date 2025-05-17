import axios from 'axios';
import { HLSManifest, HLSSegment, WalrusConfig } from '../types/stream';

// Walrus configuration
const WALRUS_CONFIG: WalrusConfig = {
  publisherUrl: (import.meta as any).env?.VITE_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space',
  aggregatorUrl: (import.meta as any).env?.VITE_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space',
  epochs: 5, // Number of epochs to store data
};

export class WalrusService {
  private publisherUrl: string;
  private aggregatorUrl: string;
  private epochs: number;

  constructor(config: WalrusConfig = WALRUS_CONFIG) {
    this.publisherUrl = config.publisherUrl;
    this.aggregatorUrl = config.aggregatorUrl;
    this.epochs = config.epochs;
  }

  /**
   * Store data on Walrus and return the blob ID
   */
  async storeBlob(data: Uint8Array | string): Promise<string> {
    try {
      const formData = new FormData();
      
      // Convert string to Uint8Array if needed
      const blobData = typeof data === 'string' 
        ? new TextEncoder().encode(data)
        : data;
      
      const blob = new Blob([blobData]);
      formData.append('file', blob);

      const response = await axios.put(
        `${this.publisherUrl}/v1/store?epochs=${this.epochs}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      if (response.data?.newlyCreated?.blobObject?.blobId) {
        return response.data.newlyCreated.blobObject.blobId;
      } else if (response.data?.alreadyCertified?.blobId) {
        return response.data.alreadyCertified.blobId;
      } else {
        throw new Error('Invalid response from Walrus publisher');
      }
    } catch (error) {
      console.error('Failed to store blob on Walrus:', error);
      throw new Error(`Walrus storage failed: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve data from Walrus using blob ID
   */
  async retrieveBlob(blobId: string): Promise<Uint8Array> {
    try {
      const response = await axios.get(
        `${this.aggregatorUrl}/v1/${blobId}`,
        {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 second timeout
        }
      );

      return new Uint8Array(response.data);
    } catch (error) {
      console.error('Failed to retrieve blob from Walrus:', error);
      throw new Error(`Walrus retrieval failed: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve data as text from Walrus
   */
  async retrieveBlobAsText(blobId: string): Promise<string> {
    const data = await this.retrieveBlob(blobId);
    return new TextDecoder().decode(data);
  }

  /**
   * Retrieve data as JSON from Walrus
   */
  async retrieveBlobAsJson<T>(blobId: string): Promise<T> {
    const text = await this.retrieveBlobAsText(blobId);
    return JSON.parse(text);
  }

  /**
   * Store HLS manifest on Walrus
   */
  async storeHLSManifest(manifest: HLSManifest): Promise<string> {
    const manifestText = this.generateM3U8Manifest(manifest);
    return await this.storeBlob(manifestText);
  }

  /**
   * Retrieve HLS manifest from Walrus
   */
  async retrieveHLSManifest(blobId: string): Promise<HLSManifest> {
    return await this.retrieveBlobAsJson<HLSManifest>(blobId);
  }

  /**
   * Store video segment on Walrus
   */
  async storeVideoSegment(segmentData: Uint8Array): Promise<string> {
    return await this.storeBlob(segmentData);
  }

  /**
   * Generate M3U8 playlist content from HLS manifest
   */
  private generateM3U8Manifest(manifest: HLSManifest): string {
    let m3u8Content = '#EXTM3U\n';
    m3u8Content += `#EXT-X-VERSION:${manifest.version}\n`;
    m3u8Content += `#EXT-X-TARGETDURATION:${manifest.targetDuration}\n`;
    m3u8Content += `#EXT-X-MEDIA-SEQUENCE:${manifest.sequence}\n`;

    for (const segment of manifest.segments) {
      m3u8Content += `#EXTINF:${segment.duration},\n`;
      // Use Walrus aggregator URL for segment retrieval
      m3u8Content += `${this.aggregatorUrl}/v1/${segment.walrusBlobId}\n`;
    }

    return m3u8Content;
  }

  /**
   * Create a new HLS manifest for a stream
   */
  createNewManifest(): HLSManifest {
    return {
      version: 3,
      targetDuration: 10,
      sequence: 0,
      segments: [],
    };
  }

  /**
   * Add a segment to an existing manifest
   */
  addSegmentToManifest(
    manifest: HLSManifest,
    segmentBlobId: string,
    duration: number
  ): HLSManifest {
    const newSegment: HLSSegment = {
      duration,
      uri: `${this.aggregatorUrl}/v1/${segmentBlobId}`,
      walrusBlobId: segmentBlobId,
      timestamp: Date.now(),
    };

    const updatedManifest = {
      ...manifest,
      segments: [...manifest.segments, newSegment],
      sequence: manifest.sequence + 1,
    };

    // Keep only the last 10 segments for live streaming
    if (updatedManifest.segments.length > 10) {
      updatedManifest.segments = updatedManifest.segments.slice(-10);
    }

    return updatedManifest;
  }

  /**
   * Get the Walrus URL for a blob ID
   */
  getBlobUrl(blobId: string): string {
    return `${this.aggregatorUrl}/v1/${blobId}`;
  }

  /**
   * Check if Walrus service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to access the publisher endpoint
      await axios.get(`${this.publisherUrl}/v1/info`, { timeout: 5000 });
      return true;
    } catch (error) {
      console.warn('Walrus health check failed:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalBlobs: number;
    totalSize: number;
    availableEpochs: number;
  }> {
    try {
      const response = await axios.get(`${this.publisherUrl}/v1/info`);
      return {
        totalBlobs: response.data?.totalBlobs || 0,
        totalSize: response.data?.totalSize || 0,
        availableEpochs: response.data?.availableEpochs || 0,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalBlobs: 0,
        totalSize: 0,
        availableEpochs: 0,
      };
    }
  }

  /**
   * Batch store multiple segments
   */
  async batchStoreSegments(segments: Uint8Array[]): Promise<string[]> {
    const promises = segments.map(segment => this.storeVideoSegment(segment));
    return await Promise.all(promises);
  }

  /**
   * Create a master playlist for adaptive bitrate streaming
   */
  generateMasterPlaylist(qualityLevels: Array<{
    bandwidth: number;
    resolution: string;
    manifestBlobId: string;
  }>): string {
    let masterPlaylist = '#EXTM3U\n';
    masterPlaylist += '#EXT-X-VERSION:3\n';

    for (const quality of qualityLevels) {
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth},RESOLUTION=${quality.resolution}\n`;
      masterPlaylist += `${this.aggregatorUrl}/v1/${quality.manifestBlobId}\n`;
    }

    return masterPlaylist;
  }

  /**
   * Store master playlist for adaptive streaming
   */
  async storeMasterPlaylist(qualityLevels: Array<{
    bandwidth: number;
    resolution: string;
    manifestBlobId: string;
  }>): Promise<string> {
    const masterPlaylist = this.generateMasterPlaylist(qualityLevels);
    return await this.storeBlob(masterPlaylist);
  }
}

// Export singleton instance
export const walrusService = new WalrusService();

// Utility functions
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const calculateStorageCost = (sizeInBytes: number, epochs: number): number => {
  // Approximate cost calculation (this would be based on actual Walrus pricing)
  const costPerBytePerEpoch = 0.000001; // Example rate
  return sizeInBytes * epochs * costPerBytePerEpoch;
}; 
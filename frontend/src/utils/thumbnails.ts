// Thumbnail generation and management utilities

export interface ThumbnailConfig {
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_THUMBNAIL_CONFIG: ThumbnailConfig = {
  width: 1280,
  height: 720,
  quality: 0.8,
  format: 'jpeg',
};

// Category-based gradient backgrounds for streams without custom thumbnails
const CATEGORY_GRADIENTS: Record<string, string> = {
  Gaming: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  Technology: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  Education: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  Music: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  Art: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  Sports: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  Entertainment: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  News: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  Lifestyle: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  Science: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

// Quality indicators for thumbnails
const QUALITY_BADGES: Record<string, { color: string; text: string }> = {
  '360p': { color: '#ef4444', text: '360p' },
  '480p': { color: '#f97316', text: '480p' },
  '720p': { color: '#eab308', text: '720p HD' },
  '1080p': { color: '#22c55e', text: '1080p FHD' },
  '1440p': { color: '#3b82f6', text: '1440p QHD' },
  '4k': { color: '#8b5cf6', text: '4K UHD' },
};

export function getCategoryGradient(category: string): string {
  return CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.default;
}

export function getQualityBadge(quality: string): { color: string; text: string } {
  return QUALITY_BADGES[quality] || QUALITY_BADGES['720p'];
}

export function generateThumbnailUrl(
  category: string,
  title: string,
  isLive: boolean = false
): string {
  // For demo purposes, generate a data URL with canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return '';
  }

  canvas.width = DEFAULT_THUMBNAIL_CONFIG.width;
  canvas.height = DEFAULT_THUMBNAIL_CONFIG.height;

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  
  // Parse gradient colors (simplified)
  if (category === 'Gaming') {
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
  } else if (category === 'Technology') {
    gradient.addColorStop(0, '#f093fb');
    gradient.addColorStop(1, '#f5576c');
  } else if (category === 'Education') {
    gradient.addColorStop(0, '#4facfe');
    gradient.addColorStop(1, '#00f2fe');
  } else if (category === 'Music') {
    gradient.addColorStop(0, '#43e97b');
    gradient.addColorStop(1, '#38f9d7');
  } else if (category === 'Art') {
    gradient.addColorStop(0, '#fa709a');
    gradient.addColorStop(1, '#fee140');
  } else {
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add overlay for better text readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add title text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Wrap text if too long
  const maxWidth = canvas.width - 100;
  const words = title.split(' ');
  let line = '';
  const lines: string[] = [];
  
  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  // Draw text lines
  const lineHeight = 60;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
  });

  // Add category badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(20, 20, 150, 40);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(category, 30, 45);

  // Add live indicator if streaming
  if (isLive) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(canvas.width - 120, 20, 100, 40);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔴 LIVE', canvas.width - 70, 45);
  }

  return canvas.toDataURL('image/jpeg', DEFAULT_THUMBNAIL_CONFIG.quality);
}

export function resizeImage(
  file: File,
  config: Partial<ThumbnailConfig> = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const finalConfig = { ...DEFAULT_THUMBNAIL_CONFIG, ...config };
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      let { width, height } = finalConfig;

      if (aspectRatio > width / height) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }

      canvas.width = finalConfig.width;
      canvas.height = finalConfig.height;

      // Fill with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center the image
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;

      ctx.drawImage(img, x, y, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        `image/${finalConfig.format}`,
        finalConfig.quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be smaller than 10MB' };
  }

  // Check supported formats
  const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!supportedFormats.includes(file.type)) {
    return { valid: false, error: 'Supported formats: JPEG, PNG, WebP, GIF' };
  }

  return { valid: true };
}

export function createPlaceholderThumbnail(
  title: string,
  category: string,
  isLive: boolean = false
): string {
  return generateThumbnailUrl(category, title, isLive);
}

// Get thumbnail URL from Walrus blob ID
export function getWalrusThumbnailUrl(blobId: string): string {
  if (!blobId || blobId === 'default_thumbnail' || blobId.startsWith('demo_')) {
    // Return empty string for demo IDs or invalid blob IDs
    return '';
  }
  
  // For development, we'll try the Walrus testnet aggregator
  // In production, this should be configurable
  return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
}

// Enhanced function to get thumbnail URL with fallback
export function getThumbnailUrlWithFallback(
  blobId: string,
  title: string,
  category: string,
  isLive: boolean = false
): string {
  // First try Walrus if we have a valid blob ID
  if (blobId && blobId !== 'default_thumbnail' && !blobId.startsWith('demo_')) {
    const walrusUrl = getWalrusThumbnailUrl(blobId);
    // For now, we'll return the Walrus URL and let the image onError handler
    // deal with fallbacks in the UI components
    return walrusUrl;
  }
  
  // Fallback to generated placeholder
  return createPlaceholderThumbnail(title, category, isLive);
}

// Create thumbnail with overlay information
export function createThumbnailWithOverlay(
  baseImageUrl: string,
  overlayInfo: {
    viewerCount?: number;
    duration?: string;
    quality?: string;
    isLive?: boolean;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw base image
      ctx.drawImage(img, 0, 0);

      // Add overlay information
      if (overlayInfo.isLive) {
        // Live indicator
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(10, 10, 80, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🔴 LIVE', 50, 30);
      }

      if (overlayInfo.viewerCount !== undefined) {
        // Viewer count
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width - 100, 10, 90, 30);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`👥 ${overlayInfo.viewerCount}`, canvas.width - 55, 30);
      }

      if (overlayInfo.duration) {
        // Duration
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width - 80, canvas.height - 40, 70, 30);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(overlayInfo.duration, canvas.width - 45, canvas.height - 20);
      }

      if (overlayInfo.quality) {
        // Quality badge
        const badge = getQualityBadge(overlayInfo.quality);
        ctx.fillStyle = badge.color;
        ctx.fillRect(10, canvas.height - 40, 80, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(badge.text, 50, canvas.height - 20);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => reject(new Error('Failed to load base image'));
    img.crossOrigin = 'anonymous';
    img.src = baseImageUrl;
  });
} 
// Utility for generating placeholder thumbnails and handling image loading

export const generatePlaceholderThumbnail = (
  streamId: string,
  title: string,
  category: string,
  width: number = 320,
  height: number = 180
): string => {
  // Create a data URL for a placeholder thumbnail
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Create gradient background based on category
  const gradients = {
    Gaming: ['#FF6B6B', '#4ECDC4'],
    Technology: ['#667eea', '#764ba2'],
    Education: ['#f093fb', '#f5576c'],
    Music: ['#4facfe', '#00f2fe'],
    Art: ['#43e97b', '#38f9d7'],
    Sports: ['#fa709a', '#fee140'],
    Entertainment: ['#a8edea', '#fed6e3'],
    News: ['#ff9a9e', '#fecfef'],
    Lifestyle: ['#ffecd2', '#fcb69f'],
    Science: ['#a18cd1', '#fbc2eb'],
  };

  const categoryGradient = gradients[category as keyof typeof gradients] || ['#667eea', '#764ba2'];
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, categoryGradient[0]);
  gradient.addColorStop(1, categoryGradient[1]);
  
  // Fill background
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add overlay pattern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < width; i += 20) {
    for (let j = 0; j < height; j += 20) {
      if ((i + j) % 40 === 0) {
        ctx.fillRect(i, j, 10, 10);
      }
    }
  }
  
  // Add text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Add category badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 80, 25);
  ctx.fillStyle = 'white';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(category, 15, 22);
  
  // Add title (truncated)
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  const truncatedTitle = title.length > 30 ? title.substring(0, 30) + '...' : title;
  ctx.fillText(truncatedTitle, width / 2, height - 30);
  
  // Add live indicator
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(width - 60, 10, 50, 20);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('LIVE', width - 35, 20);
  
  return canvas.toDataURL();
};

export const getThumbnailUrl = (walrusId: string, fallbackData?: {
  streamId: string;
  title: string;
  category: string;
}): string => {
  // If it's a mock ID, generate a placeholder
  if (walrusId.startsWith('mock_thumbnail_') && fallbackData) {
    return generatePlaceholderThumbnail(
      fallbackData.streamId,
      fallbackData.title,
      fallbackData.category
    );
  }
  
  // For real Walrus IDs, return the blob URL
  if (walrusId && !walrusId.startsWith('mock_')) {
    return `https://aggregator.walrus-testnet.walrus.space/v1/${walrusId}`;
  }
  
  // Default placeholder
  return generatePlaceholderThumbnail(
    fallbackData?.streamId || 'default',
    fallbackData?.title || 'Stream',
    fallbackData?.category || 'Gaming'
  );
};

export const createThumbnailFromVideo = (
  videoElement: HTMLVideoElement,
  timestamp: number = 0
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    const captureFrame = () => {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      ctx.drawImage(videoElement, 0, 0);
      
      // Add live overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 60, 25);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(12, 12, 8, 8);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('LIVE', 25, 25);
      
      resolve(canvas.toDataURL());
    };
    
    if (videoElement.readyState >= 2) {
      // Video is loaded enough to capture
      videoElement.currentTime = timestamp;
      videoElement.addEventListener('seeked', captureFrame, { once: true });
    } else {
      // Wait for video to load
      videoElement.addEventListener('loadeddata', () => {
        videoElement.currentTime = timestamp;
        videoElement.addEventListener('seeked', captureFrame, { once: true });
      }, { once: true });
    }
  });
}; 
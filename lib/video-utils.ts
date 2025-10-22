// Utility functions for handling YouTube videos

export interface VideoInfo {
  originalUrl: string;
  embedUrl: string;
  videoId: string;
  title: string;
}

/**
 * Converts a YouTube URL to embeddable format
 */
export function convertToEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // Remove any whitespace
  url = url.trim();
  
  // Handle different YouTube URL formats
  const patterns = [
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // Short URL: https://youtu.be/VIDEO_ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  return null;
}

/**
 * Extracts video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Parses multiple YouTube URLs separated by comma and space
 */
export function parseMultipleVideoUrls(videoUrls: string): VideoInfo[] {
  if (!videoUrls) return [];
  
  // Split by comma and space, then trim each URL
  const urls = videoUrls.split(', ').map(url => url.trim()).filter(url => url.length > 0);
  
  return urls.map(url => {
    const videoId = extractVideoId(url);
    const embedUrl = convertToEmbedUrl(url);
    
    return {
      originalUrl: url,
      embedUrl: embedUrl || url,
      videoId: videoId || '',
      title: `Video Tutorial ${videoId ? `(${videoId})` : ''}`
    };
  }).filter(video => video.embedUrl); // Only include valid YouTube URLs
}

/**
 * Checks if a URL is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return convertToEmbedUrl(url) !== null;
}

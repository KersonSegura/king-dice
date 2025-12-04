// Board game data for the shop
// Replace YOUR_TAG with your actual Amazon Associates tag ID

export interface BoardGame {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  amazonUrl: string; // Full Amazon Associates link with your tag
  asin: string; // Amazon ASIN for price fetching
  price?: string; // Current price (can be updated manually or via API)
  originalPrice?: string; // Original/regular price for comparison
  rating?: number;
  players?: string;
  playTime?: string;
  category?: string;
  ageRange?: string;
  lastPriceUpdate?: string; // ISO date string of last price update
}

// Amazon Associates tag - Replace with your actual tag
const AMAZON_TAG = 'kingdice-20'; // e.g., 'kingdice-20'

// Helper function to create Amazon Associates link
// This creates a basic link format. For better tracking, use the full link from SiteStripe.
export function createAmazonLink(asin: string, tag: string = AMAZON_TAG): string {
  // Amazon Associates link format: https://www.amazon.com/dp/ASIN?tag=YOUR_TAG
  // This is the minimum required format and works perfectly fine.
  // However, SiteStripe links have additional tracking parameters that can be helpful.
  return `https://www.amazon.com/dp/${asin}?tag=${tag}`;
}

// Helper function to extract ASIN from any Amazon URL format
export function extractASINFromUrl(url: string): string | null {
  // Handle full Amazon URLs: amazon.com/dp/ASIN
  const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
  if (dpMatch) return dpMatch[1];
  
  // Handle product URLs: amazon.com/product/ASIN
  const productMatch = url.match(/\/product\/([A-Z0-9]{10})/);
  if (productMatch) return productMatch[1];
  
  // Handle short links (amzn.to) - these need to be resolved first
  // For now, return null and recommend using the full URL
  if (url.includes('amzn.to/')) {
    return null; // Short links need to be resolved to get ASIN
  }
  
  return null;
}

// Helper function to normalize Amazon URL
// If you have a SiteStripe link, use it directly. Otherwise, this creates a basic link.
export function normalizeAmazonUrl(urlOrAsin: string, tag: string = AMAZON_TAG): string {
  // If it's already a full URL with the tag, use it as-is (SiteStripe link)
  if (urlOrAsin.includes('amazon.com') && urlOrAsin.includes(`tag=${tag}`)) {
    return urlOrAsin;
  }
  
  // If it's a full URL without tag, add the tag
  if (urlOrAsin.includes('amazon.com/dp/')) {
    const asin = extractASINFromUrl(urlOrAsin);
    if (asin) {
      // Check if URL already has query parameters
      if (urlOrAsin.includes('?')) {
        return `${urlOrAsin}&tag=${tag}`;
      } else {
        return `${urlOrAsin}?tag=${tag}`;
      }
    }
  }
  
  // If it's just an ASIN, create the basic link
  if (/^[A-Z0-9]{10}$/.test(urlOrAsin)) {
    return createAmazonLink(urlOrAsin, tag);
  }
  
  // If it's a short link (amzn.to), return as-is (it should already have tracking)
  if (urlOrAsin.includes('amzn.to/')) {
    return urlOrAsin;
  }
  
  // Fallback: assume it's an ASIN
  return createAmazonLink(urlOrAsin, tag);
}

// Helper function to get Amazon product image URL from ASIN
// Note: This uses a common Amazon image URL pattern, but may not work for all products
// It's better to use the actual image URL from Amazon's product page
export function getAmazonImageUrl(asin: string, size: 'small' | 'medium' | 'large' = 'large'): string {
  // Amazon image URL pattern (this is a fallback - actual images may have different IDs)
  // For best results, get the image URL directly from the Amazon product page
  const sizeMap = {
    small: '_AC_SL150_.jpg',
    medium: '_AC_SL500_.jpg',
    large: '_AC_SL1500_.jpg'
  };
  
  // This is a placeholder - you should replace this with actual image URLs from Amazon
  // The actual image URL structure varies, so it's best to get it from the product page
  return `https://m.media-amazon.com/images/I/[IMAGE_ID]${sizeMap[size]}`;
}

// Helper function to generate local image path (fallback)
export function getLocalImagePath(gameName: string): string {
  const imageName = gameName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `/games/${imageName}.jpg`;
}

// Board games catalog
// Add your board games here with their Amazon ASINs
export const boardGames: BoardGame[] = [
  {
    id: 'catan',
    name: 'Catan',
    description: 'The classic strategy game of trading and building settlements. Build roads, settlements, and cities to expand your civilization. Explore the island of Catan by gathering resources, building infrastructure, and nurturing trade relationships.',
    imageUrl: 'https://m.media-amazon.com/images/I/81QZ1fV9+YL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.com/dp/B0DYK1ZH2D?tag=kingdice-20',
    asin: 'B0DYK1ZH2D',
    price: '$29.99',
    originalPrice: '$54.99',
    rating: 4.8,
    players: '3-4',
    playTime: '60-90 min',
    category: 'Strategy',
    ageRange: '10+',
    lastPriceUpdate: new Date().toISOString()
  }
];

// Get games by category
export function getGamesByCategory(category: string | null): BoardGame[] {
  if (!category) return boardGames;
  return boardGames.filter(game => game.category === category);
}

// Get all unique categories
export function getCategories(): string[] {
  return Array.from(new Set(boardGames.map(game => game.category).filter(Boolean))) as string[];
}
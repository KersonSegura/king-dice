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
    amazonUrl: 'https://www.amazon.com/dp/B0DYK1ZH2D?coliid=I3AN8YQZ35DOV8&colid=2AM8KE7XTVQEL&th=1&linkCode=ll1&tag=kingdice-20&linkId=19c20e46df7bd07028b556973934847d&language=en_US&ref_=as_li_ss_tl',
    asin: 'B0DYK1ZH2D',
    price: '$29.99',
    originalPrice: '$54.99',
    rating: 4.8,
    players: '3-4',
    playTime: '60-90 min',
    category: 'Strategy',
    ageRange: '10+',
    lastPriceUpdate: new Date().toISOString()
  },
  {
    id: 'ticket-to-ride',
    name: 'Ticket to Ride',
    description: 'Build your railway empire across North America. Collect train cards to claim railway routes connecting cities.',
    imageUrl: '/games/ticket-to-ride.jpg',
    amazonUrl: 'https://www.amazon.com/dp/B0F8PKN4B7?pd_rd_i=B0F8PKN4B7&pd_rd_w=OV8TV&content-id=amzn1.sym.386c274b-4bfe-4421-9052-a1a56db557ab&pf_rd_p=386c274b-4bfe-4421-9052-a1a56db557ab&pf_rd_r=HK3RKD85B6060JSARHTP&pd_rd_wg=l2qVU&pd_rd_r=1438c20f-9244-4bfd-8ed9-b4715784acf0&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWxfdGhlbWF0aWM&th=1&linkCode=ll1&tag=kingdice-20&linkId=a611fb41eb06ac1de194d7e1eb9446cf&language=en_US&ref_=as_li_ss_tl',
    asin: 'B0F8PKN4B7',
    price: '$0.00', // TODO: Update with current price from Amazon
    rating: 4.7, // TODO: Update with actual rating from Amazon
    players: '2-5',
    playTime: '30-60 min',
    category: 'Family',
    ageRange: '8+',
    lastPriceUpdate: new Date().toISOString()
  },
  {
    id: 'azul',
    name: 'Azul',
    description: 'A tile-placement game where players compete to create the most beautiful Portuguese mosaic.',
    imageUrl: '/games/azul.jpg',
    amazonUrl: 'https://www.amazon.com/dp/B077MZ2MPW?psc=1&pd_rd_i=B077MZ2MPW&pd_rd_w=aGL1m&content-id=amzn1.sym.f2f1cf8f-cab4-44dc-82ba-0ca811fb90cc&pf_rd_p=f2f1cf8f-cab4-44dc-82ba-0ca811fb90cc&pf_rd_r=GNW5XN1NXGFN4ZQBT7K0&pd_rd_wg=l7mts&pd_rd_r=6874325f-f88f-4da1-90cc-7e1cc7871634&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWxfdGhlbWF0aWM&linkCode=ll1&tag=kingdice-20&linkId=fc14262ecca9aee33d0e091f09c3d784&language=en_US&ref_=as_li_ss_tl',
    asin: 'B077MZ2MPW',
    price: '$0.00', // TODO: Update with current price from Amazon
    rating: 4.6, // TODO: Update with actual rating from Amazon
    players: '2-7',
    playTime: '30-45 min',
    category: 'Family',
    ageRange: '8+',
    lastPriceUpdate: new Date().toISOString()
  },
  {
    id: 'wingspan',
    name: 'Wingspan',
    description: 'A competitive bird-collection engine-building game. Attract birds to your wildlife preserves.',
    imageUrl: '/games/wingspan.jpg',
    amazonUrl: 'https://www.amazon.com/Stonemaier-Games-STM910-Wingspan-Multi-colored/dp/B07YQ641NQ?crid=3JQ0UPT4AYH8A&dib=eyJ2IjoiMSJ9.gqnW20FyiJXWhEdrpl9eyy66Y0KlZBWpAvfHs7ITG1UIJU0ZsovS1tAEoj2vXw8fxWuz5t_1x_AasFc53NN_Pn3QfP0o4QGCTBF09NZAD-chn_yBmoZkvB0W122t3j1uNkyczlS5bIuULIuriGjmRM9iUgSmLBsgvuUh7ilQSEsieSf-tUeGNFovH5Oth0PmtJcUgI7MJas5IV8i99cw5xvadMxHPzyw_BDCe6mmXgfg8W2p9RlmyAFUE4tUA_ElSrhKkMlyMa1h8n9u0MTK9brr0GjeNLXqC6SCzYriOZo.Tl4s0u5EVK6mxoavOhGatJDeY4QwsCYBCFCcfzKYxZo&dib_tag=se&keywords=wingspan%2Bboard%2Bgame&qid=1764804397&s=toys-and-games&sprefix=wingspan%2Ctoys-and-games%2C209&sr=1-2&th=1&linkCode=ll1&tag=kingdice-20&linkId=d43f8cecfa61ee3dee0657e470ebd66d&language=en_US&ref_=as_li_ss_tl',
    asin: 'B07YQ641NQ',
    price: '$0.00', // TODO: Update with current price from Amazon
    rating: 4.9, // TODO: Update with actual rating from Amazon
    players: '1-5',
    playTime: '40-70 min',
    category: 'Strategy',
    ageRange: '10+',
    lastPriceUpdate: new Date().toISOString()
  },
  {
    id: 'would-you-rather',
    name: 'Would You Rather?',
    description: 'A fun party game where players choose between two difficult or hilarious scenarios.',
    imageUrl: '/games/would-you-rather.jpg',
    amazonUrl: 'https://www.amazon.com/dp/B0BRT58L5W?coliid=IFP9ZDH9NFXEN&colid=2AM8KE7XTVQEL&th=1&linkCode=ll1&tag=kingdice-20&linkId=9a78f70136d464c0e35a6c1cb11f73c2&language=en_US&ref_=as_li_ss_tl',
    asin: 'B0BRT58L5W',
    price: '$0.00', // TODO: Update with current price from Amazon
    rating: 4.5, // TODO: Update with actual rating from Amazon
    players: '3-6',
    category: 'Party',
    ageRange: '8+',
    lastPriceUpdate: new Date().toISOString()
  },
  {
    id: 'herd-mentality',
    name: 'Herd Mentality',
    description: 'A hilarious party game where you try to think like the herd. The goal is to match answers with the majority.',
    imageUrl: '/games/herd-mentality.jpg',
    amazonUrl: 'https://www.amazon.com/dp/B093HBBMPT?pd_rd_i=B093HBBMPT&pd_rd_w=BNEZ0&content-id=amzn1.sym.386c274b-4bfe-4421-9052-a1a56db557ab&pf_rd_p=386c274b-4bfe-4421-9052-a1a56db557ab&pf_rd_r=JV7NQ7QEQK07Z2N3YKDT&pd_rd_wg=n9iHr&pd_rd_r=e2ee8c94-b430-409f-a3cd-c4f39f404b61&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWxfdGhlbWF0aWM&th=1&linkCode=ll1&tag=kingdice-20&linkId=48ae4cb3525e074bdcf68ae5659055b8&language=en_US&ref_=as_li_ss_tl',
    asin: 'B093HBBMPT',
    price: '$0.00', // TODO: Update with current price from Amazon
    rating: 4.6, // TODO: Update with actual rating from Amazon
    players: '4-20',
    playTime: '20 min',
    category: 'Family',
    ageRange: '10+',
    lastPriceUpdate: new Date().toISOString()
  },
  {
    id: 'carcassonne',
    name: 'Carcassonne',
    description: 'A tile-laying game where players build the medieval landscape of Carcassonne, placing followers to score points.',
    imageUrl: '/games/carcassonne.jpg',
    amazonUrl: 'https://www.amazon.com/Asmodee-Carcassonne-Board-Game-Tile-Laying/dp/B00NX627HW?crid=3JQ0UPT4AYH8A&dib=eyJ2IjoiMSJ9.gqnW20FyiJXWhEdrpl9eyy66Y0KlZBWpAvfHs7ITG1UIJU0ZsovS1tAEoj2vXw8fxWuz5t_1x_AasFc53NN_Pn3QfP0o4QGCTBF09NZAD-chn_yBmoZkvB0W122t3j1uNkyczlS5bIuULIuriGjmRM9iUgSmLBsgvuUh7ilQSEsieSf-tUeGNFovH5Oth0PmtJcUgI7MJas5IV8i99cw5xvadMxHPzyw_BDCe6mmXgfg8W2p9RlmyAFUE4tUA_ElSrhKkMlyMa1h8n9u0MTK9brr0GjeNLXqC6SCzYriOZo.Tl4s0u5EVK6mxoavOhGatJDeY4QwsCYBCFCcfzKYxZo&dib_tag=se&keywords=wingspan%2Bboard%2Bgame&qid=1764804397&s=toys-and-games&sprefix=wingspan%2Ctoys-and-games%2C209&sr=1-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&th=1&linkCode=ll1&tag=kingdice-20&linkId=40a78fbfca4fa5b4aa8ca0064316399e&language=en_US&ref_=as_li_ss_tl',
    asin: 'B00NX627HW',
    price: '$0.00', // TODO: Update with current price from Amazon
    rating: 4.7, // TODO: Update with actual rating from Amazon
    players: '2-5',
    playTime: '35 min',
    category: 'Strategy',
    ageRange: '7+',
    lastPriceUpdate: new Date().toISOString()
  },
  {
    id: 'risk',
    name: 'Risk',
    description: 'The classic game of strategic conquest. Command your armies, conquer territories, and eliminate opponents to achieve global domination.',
    imageUrl: '/games/risk.jpg',
    amazonUrl: 'https://www.amazon.com/dp/B01ALHAIWG?psc=1&pf_rd_p=bbb3fb5e-28ad-4062-a3ba-1f7b9f2e4371&pf_rd_r=GKF4C0PWJ2RN7XH4J7SZ&pd_rd_wg=oZJ21&pd_rd_w=h4hW7&content-id=amzn1.sym.bbb3fb5e-28ad-4062-a3ba-1f7b9f2e4371&pd_rd_r=2236e842-3edf-4056-b6d8-c2003d5f53fd&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWxfdGhlbWF0aWM&linkCode=ll1&tag=kingdice-20&linkId=2c0a50c0af33e75ac9e38c089f8943c0&language=en_US&ref_=as_li_ss_tl',
    asin: 'B01ALHAIWG',
    price: '$0.00', // TODO: Update with current price from Amazon
    rating: 4.5, // TODO: Update with actual rating from Amazon
    players: '2-5',
    playTime: '60-120 min',
    category: 'Strategy',
    ageRange: '10+',
    lastPriceUpdate: new Date().toISOString()
  },
  {
    id: 'exploding-kittens-party-pack',
    name: 'Exploding Kittens Party Pack',
    description: 'A card game for people who are into kittens and explosions and laser beams. The Party Pack supports up to 10 players.',
    imageUrl: '/games/exploding-kittens-party-pack.jpg',
    amazonUrl: 'https://www.amazon.com/dp/B07CTXHNSL?coliid=IPMNEMR2BYJFZ&colid=2AM8KE7XTVQEL&th=1&linkCode=ll1&tag=kingdice-20&linkId=653109cbc8cc911cdd4731e399120bc4&language=en_US&ref_=as_li_ss_tl',
    asin: 'B07CTXHNSL',
    price: '$0.00', // TODO: Update with current price from Amazon
    rating: 4.8, // TODO: Update with actual rating from Amazon
    players: '2-10',
    playTime: '15 min',
    category: 'Party',
    ageRange: '7+',
    lastPriceUpdate: new Date().toISOString()
  },
  {
    id: 'splendor',
    name: 'Splendor',
    description: 'Acquire mines and transportation, hire artisans, and create the most prestigious jewelry business in the Renaissance.',
    imageUrl: '/games/splendor.jpg',
    amazonUrl: 'https://www.amazon.com/Asmodee-SPL01-Splendor/dp/B00IZEUFIA?pd_rd_w=FFznU&content-id=amzn1.sym.ea1d9533-fbb7-4608-bb6f-bfdceb6f6336&pf_rd_p=ea1d9533-fbb7-4608-bb6f-bfdceb6f6336&pf_rd_r=N9PJPEMY8GF9N1Q3P2Y0&pd_rd_wg=j00Df&pd_rd_r=bc3c8a3a-7e6e-4a1b-9bdc-357eb18037da&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWxfdGhlbWF0aWM&th=1&linkCode=ll1&tag=kingdice-20&linkId=0d7e9e74df8051b2b5989a6db09b16a5&language=en_US&ref_=as_li_ss_tl',
    asin: 'B00IZEUFIA',
    price: '$0.00', // TODO: Update with current price from Amazon
    rating: 4.6, // TODO: Update with actual rating from Amazon
    players: '2-4',
    playTime: '30 min',
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
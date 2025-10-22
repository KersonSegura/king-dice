import { NextRequest, NextResponse } from 'next/server';

// Conditional import for jsdom (only available in development)
let JSDOM: any = null;
try {
  if (process.env.NODE_ENV === 'development') {
    JSDOM = require('jsdom').JSDOM;
  }
} catch (error) {
  console.log('JSDOM not available in production environment');
}

export async function POST(request: NextRequest) {
  try {
    // Check if JSDOM is available (only in development)
    if (!JSDOM) {
      return NextResponse.json(
        { error: 'Scraping functionality is only available in development environment' },
        { status: 503 }
      );
    }

    const { gameUrl, rulesUrl } = await request.json();
    
    if (!gameUrl) {
      return NextResponse.json(
        { error: 'Game URL is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Starting general scraper for:', gameUrl);
    
    // Detect website type and scrape accordingly
    const websiteType = detectWebsiteType(gameUrl);
    console.log('📋 Detected website type:', websiteType);
    
    // Scrape basic game information
    const gameInfo = await scrapeGameInfo(gameUrl, websiteType);
    
    // Scrape rules if URL provided
    let rulesContent = null;
    let fullDescription = gameInfo.fullDescription;
    
    if (rulesUrl) {
      const rulesData = await scrapeGameRules(rulesUrl, websiteType);
      rulesContent = rulesData.rulesContent;
      
      // If we found a better description in the rules page, use it
      if (rulesData.description && rulesData.description.length > (fullDescription?.length || 0)) {
        fullDescription = rulesData.description;
        gameInfo.fullDescription = fullDescription;
      }
      
      // If we found an image in the rules page, use it
      if (rulesData.imageUrl) {
        gameInfo.imageUrl = rulesData.imageUrl;
        gameInfo.thumbnailUrl = rulesData.imageUrl;
        console.log('✅ Found image:', rulesData.imageUrl);
      }
    }

    return NextResponse.json({
      success: true,
      gameInfo,
      rulesContent,
      websiteType
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to scrape game information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function detectWebsiteType(url: string): string {
  if (url.includes('officialgamerules.org')) return 'officialgamerules';
  if (url.includes('ultraboardgames.com')) return 'ultraboardgames';
  if (url.includes('boardgamegeek.com')) return 'boardgamegeek';
  if (url.includes('howtoplay.games')) return 'howtoplay';
  if (url.includes('yucata.de')) return 'yucata';
  return 'generic';
}

async function scrapeGameInfo(url: string, websiteType: string) {
  console.log('📖 Scraping game info from:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      console.log('⚠️ Direct scraping failed, trying fallback method...');
      return scrapeFromUrlStructure(url, websiteType);
    }
    
    const html = await response.text();
    console.log('📄 HTML length:', html.length);
    
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Use website-specific scraping logic
    switch (websiteType) {
      case 'officialgamerules':
        return scrapeOfficialGameRules(document, url);
      case 'ultraboardgames':
        return scrapeUltraBoardGames(document, url);
      case 'boardgamegeek':
        return scrapeBoardGameGeek(document, url);
      default:
        return scrapeGeneric(document, url);
    }
  } catch (error) {
    console.log('⚠️ Scraping failed, using fallback method:', error);
    return scrapeFromUrlStructure(url, websiteType);
  }
}

// Fallback scraper that works with URL structure when direct scraping fails
function scrapeFromUrlStructure(url: string, websiteType: string) {
  console.log('🔄 Using URL structure fallback for:', websiteType);
  
  let nameEn = '';
  let fullDescription = '';
  
  // Extract game name from URL - handle different URL patterns
  const urlParts = url.split('/').filter(part => part !== ''); // Remove empty parts
  const lastPart = urlParts[urlParts.length - 1];
  
  console.log('🔍 URL parts:', urlParts);
  console.log('🔍 Last part:', lastPart);
  
  if (lastPart && lastPart !== 'game-rules' && lastPart !== 'rules') {
    // Remove common URL suffixes
    let gameName = lastPart.replace(/\/$/, ''); // Remove trailing slash
    
    // Convert from kebab-case to Title Case
    nameEn = gameName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    // Handle common word combinations
    nameEn = nameEn.replace(/\bAnd\b/g, 'and')
                  .replace(/\bOf\b/g, 'of')
                  .replace(/\bThe\b/g, 'the')
                  .replace(/\bA\b/g, 'a')
                  .replace(/\bAn\b/g, 'an');
    
    // Capitalize first letter of each major word
    nameEn = nameEn.replace(/\b\w/g, char => char.toUpperCase());
  }
  
  // Generate a basic description based on the game name
  if (nameEn) {
    fullDescription = `${nameEn} is a strategic board game. Complete rules and detailed gameplay information are available at the official source. This game offers engaging mechanics and strategic depth for players.`;
  }
  
  console.log('✅ Fallback extraction complete:', { nameEn, descriptionLength: fullDescription.length });
  
  return {
    nameEn,
    fullDescription,
    imageUrl: '',
    thumbnailUrl: '',
    yearRelease: undefined,
    minPlayers: undefined,
    maxPlayers: undefined,
    durationMinutes: undefined,
    designer: '',
    developer: ''
  };
}

async function scrapeGameRules(url: string, websiteType: string) {
  console.log('📋 Scraping rules from:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000
    });
    
    if (!response.ok) {
      console.log('⚠️ Rules scraping failed, using fallback...');
      return {
        rulesContent: `Game rules are available at: ${url}`,
        description: '',
        imageUrl: ''
      };
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Use website-specific scraping logic for rules
    switch (websiteType) {
      case 'officialgamerules':
        return scrapeOfficialGameRulesContent(document, url);
      case 'ultraboardgames':
        return scrapeUltraBoardGamesContent(document, url);
      default:
        return scrapeGenericContent(document, url);
    }
  } catch (error) {
    console.log('⚠️ Rules scraping failed, using fallback:', error);
    return {
      rulesContent: `Game rules are available at: ${url}`,
      description: '',
      imageUrl: ''
    };
  }
}

// Official Game Rules scraper
function scrapeOfficialGameRules(document: Document, url: string) {
  console.log('🎯 Scraping Official Game Rules format');
  
  let nameEn = '';
  let fullDescription = '';
  let imageUrl = '';
  let yearRelease: number | undefined;
  let minPlayers: number | undefined;
  let maxPlayers: number | undefined;
  let durationMinutes: number | undefined;
  let designer = '';
  let developer = '';

  // Extract game name from title or h1 - try multiple selectors
  const titleSelectors = ['h1', '.game-title', '.entry-title', 'title', '.post-title'];
  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent?.trim()) {
      nameEn = titleElement.textContent.trim();
      // Clean up common suffixes
      nameEn = nameEn.replace(/ - Official Game Rules.*$/i, '')
                    .replace(/ Game Rules.*$/i, '')
                    .replace(/ - How to Play.*$/i, '')
                    .replace(/ Rules.*$/i, '')
                    .trim();
      if (nameEn) break;
    }
  }

  // If no title found, try to extract from URL
  if (!nameEn) {
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart !== 'game-rules') {
      nameEn = lastPart.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  }

  // Extract description
  const descriptionSelectors = [
    '.game-description',
    '.description',
    '.intro',
    '.game-intro',
    'meta[name="description"]',
    'p:first-of-type'
  ];
  
  for (const selector of descriptionSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      let text = '';
      if (selector.includes('meta')) {
        text = element.getAttribute('content') || '';
      } else {
        text = element.textContent?.trim() || '';
      }
      
      if (text.length > (fullDescription?.length || 0)) {
        fullDescription = text;
      }
    }
  }

  // Extract image with better selectors for Official Game Rules
  const imageSelectors = [
    '.entry-content img:first-of-type',
    '.post-content img:first-of-type',
    '.game-image img',
    '.hero-image img',
    '.game-cover img',
    '.featured-image img',
    'img[alt*="cover"]',
    'img[alt*="game"]',
    'img[alt*="brass"]',
    'img[alt*="birmingham"]',
    'article img:first-of-type',
    'main img:first-of-type'
  ];
  
  for (const selector of imageSelectors) {
    const img = document.querySelector(selector) as HTMLImageElement;
    if (img && img.src && !img.src.includes('data:') && !img.src.includes('placeholder')) {
      imageUrl = img.src;
      if (!imageUrl.startsWith('http')) {
        imageUrl = new URL(imageUrl, url).href;
      }
      console.log('✅ Found image with selector:', selector, imageUrl);
      break;
    }
  }

  // Extract game details from meta tags or structured data
  const metaTags = document.querySelectorAll('meta');
  metaTags.forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
    const content = meta.getAttribute('content') || '';
    
    switch (name.toLowerCase()) {
      case 'year':
      case 'release-date':
        const year = parseInt(content);
        if (!isNaN(year) && year > 1900 && year < 2030) {
          yearRelease = year;
        }
        break;
      case 'players':
      case 'min-players':
        const min = parseInt(content);
        if (!isNaN(min) && min > 0) {
          minPlayers = min;
        }
        break;
      case 'max-players':
        const max = parseInt(content);
        if (!isNaN(max) && max > 0) {
          maxPlayers = max;
        }
        break;
      case 'duration':
      case 'playtime':
        const duration = parseInt(content);
        if (!isNaN(duration) && duration > 0) {
          durationMinutes = duration;
        }
        break;
      case 'designer':
        designer = content;
        break;
      case 'publisher':
        developer = content;
        break;
    }
  });

  console.log('✅ Scraped Official Game Rules data:', {
    nameEn,
    descriptionLength: fullDescription.length,
    hasImage: !!imageUrl,
    yearRelease,
    minPlayers,
    maxPlayers,
    durationMinutes,
    designer,
    developer
  });

  return {
    nameEn,
    fullDescription,
    imageUrl,
    thumbnailUrl: imageUrl,
    yearRelease,
    minPlayers,
    maxPlayers,
    durationMinutes,
    designer,
    developer
  };
}

function scrapeOfficialGameRulesContent(document: Document, url: string) {
  console.log('📋 Scraping Official Game Rules content with markdown support');
  
  let rulesContent = '';
  let description = '';
  let imageUrl = '';
  let markdownContent = '';

  // Extract rules content with better selectors for Official Game Rules
  const rulesSelectors = [
    '.entry-content',
    '.post-content', 
    '.content',
    'article .content',
    '.game-rules-content',
    'main',
    'article'
  ];
  
  for (const selector of rulesSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Try to get both text and HTML content
      const textContent = element.textContent?.trim() || '';
      const htmlContent = element.innerHTML || '';
      
      if (textContent.length > 100) {
        rulesContent = textContent;
        
        // Convert HTML to markdown-like format
        markdownContent = htmlToMarkdown(htmlContent, url);
        break;
      }
    }
  }

  // Extract description from intro or first paragraph
  const introSelectors = [
    '.entry-content p:first-of-type',
    '.post-content p:first-of-type',
    '.intro',
    '.game-intro',
    '.description',
    'p:first-of-type'
  ];
  
  for (const selector of introSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      description = element.textContent?.trim() || '';
      if (description.length > 50) break;
    }
  }

  // Extract all images and convert to markdown format
  const allImages = document.querySelectorAll('img');
  const imageMarkdowns: string[] = [];
  
  allImages.forEach((img, index) => {
    if (img.src && !img.src.includes('data:') && !img.src.includes('placeholder')) {
      let imgUrl = img.src;
      if (!imgUrl.startsWith('http')) {
        imgUrl = new URL(imgUrl, url).href;
      }
      
      const altText = img.alt || `Game image ${index + 1}`;
      imageMarkdowns.push(`![${altText}](${imgUrl})`);
      
      // Use the first good image as the main image
      if (!imageUrl) {
        imageUrl = imgUrl;
      }
    }
  });

  // Combine markdown content with images
  if (markdownContent && imageMarkdowns.length > 0) {
    markdownContent = imageMarkdowns.join('\n\n') + '\n\n' + markdownContent;
  }

  console.log('✅ Scraped Official Game Rules content:', {
    rulesLength: rulesContent.length,
    descriptionLength: description.length,
    hasImage: !!imageUrl,
    imageCount: imageMarkdowns.length,
    markdownLength: markdownContent.length
  });

  return {
    rulesContent: markdownContent || rulesContent,
    description,
    imageUrl
  };
}

// Helper function to convert HTML to markdown-like format
function htmlToMarkdown(html: string, baseUrl: string): string {
  // Remove script and style tags
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Convert headings and create anchor IDs
  html = html.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
    const hashes = '#'.repeat(parseInt(level));
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    
    // Create anchor ID from heading text
    const anchorId = cleanContent
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `\n${hashes} ${cleanContent} {#${anchorId}}\n`;
  });
  
  // Convert paragraphs
  html = html.replace(/<p[^>]*>(.*?)<\/p>/gi, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return cleanContent ? `${cleanContent}\n\n` : '';
  });
  
  // Convert lists
  html = html.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gi);
    if (items) {
      const listItems = items.map(item => {
        const cleanItem = item.replace(/<[^>]*>/g, '').trim();
        return `- ${cleanItem}`;
      }).join('\n');
      return `\n${listItems}\n\n`;
    }
    return '';
  });
  
  html = html.replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gi);
    if (items) {
      const listItems = items.map((item, index) => {
        const cleanItem = item.replace(/<[^>]*>/g, '').trim();
        return `${index + 1}. ${cleanItem}`;
      }).join('\n');
      return `\n${listItems}\n\n`;
    }
    return '';
  });
  
  // Convert strong/bold
  html = html.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
  
  // Convert emphasis/italic
  html = html.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
  
  // Convert line breaks
  html = html.replace(/<br\s*\/?>/gi, '\n');
  
  // Convert links
  html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, href, text) => {
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    
    // Check if it's an internal anchor link (starts with #)
    if (href.startsWith('#')) {
      // Convert internal link to anchor reference
      return `[${cleanText}](${href})`;
    }
    
    // Check if it's a link to the same page with an anchor (e.g., rulespal.com/page#anchor)
    try {
      const currentUrl = new URL(baseUrl);
      const linkUrl = new URL(href, baseUrl);
      
      // If it's the same domain and has an anchor, convert to internal link
      if (linkUrl.hostname === currentUrl.hostname && linkUrl.hash) {
        return `[${cleanText}](${linkUrl.hash})`;
      }
    } catch (e) {
      // If URL parsing fails, treat as external link
    }
    
    // External links
    let linkUrl = href;
    if (!linkUrl.startsWith('http')) {
      linkUrl = new URL(linkUrl, baseUrl).href;
    }
    return `[${cleanText}](${linkUrl})`;
  });
  
  // Remove remaining HTML tags
  html = html.replace(/<[^>]*>/g, '');
  
  // Clean up extra whitespace
  html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
  html = html.replace(/^\s+|\s+$/g, '');
  
  return html;
}

// UltraBoardGames scraper (existing logic)
function scrapeUltraBoardGames(document: Document, url: string) {
  // Implementation from existing ultraboardgames scraper
  // ... (copy existing logic here)
  return {
    nameEn: '',
    fullDescription: '',
    imageUrl: '',
    thumbnailUrl: '',
    yearRelease: undefined,
    minPlayers: undefined,
    maxPlayers: undefined,
    durationMinutes: undefined,
    designer: '',
    developer: ''
  };
}

function scrapeUltraBoardGamesContent(document: Document, url: string) {
  // Implementation from existing ultraboardgames scraper
  return {
    rulesContent: '',
    description: '',
    imageUrl: ''
  };
}

// BoardGameGeek scraper
function scrapeBoardGameGeek(document: Document, url: string) {
  console.log('🎯 Scraping BoardGameGeek format');
  // BoardGameGeek specific scraping logic
  return {
    nameEn: '',
    fullDescription: '',
    imageUrl: '',
    thumbnailUrl: '',
    yearRelease: undefined,
    minPlayers: undefined,
    maxPlayers: undefined,
    durationMinutes: undefined,
    designer: '',
    developer: ''
  };
}

// Generic scraper for unknown websites
function scrapeGeneric(document: Document, url: string) {
  console.log('🎯 Using generic scraper');
  
  let nameEn = '';
  let fullDescription = '';
  let imageUrl = '';

  // Try to extract title
  const titleElement = document.querySelector('h1, title');
  if (titleElement) {
    nameEn = titleElement.textContent?.trim() || '';
  }

  // Try to extract description
  const descriptionElement = document.querySelector('meta[name="description"], p:first-of-type');
  if (descriptionElement) {
    if (descriptionElement.tagName === 'META') {
      fullDescription = descriptionElement.getAttribute('content') || '';
    } else {
      fullDescription = descriptionElement.textContent?.trim() || '';
    }
  }

  // Try to extract image
  const img = document.querySelector('img') as HTMLImageElement;
  if (img && img.src) {
    imageUrl = img.src;
    if (!imageUrl.startsWith('http')) {
      imageUrl = new URL(imageUrl, url).href;
    }
  }

  return {
    nameEn,
    fullDescription,
    imageUrl,
    thumbnailUrl: imageUrl,
    yearRelease: undefined,
    minPlayers: undefined,
    maxPlayers: undefined,
    durationMinutes: undefined,
    designer: '',
    developer: ''
  };
}

function scrapeGenericContent(document: Document, url: string) {
  let rulesContent = '';
  let description = '';

  // Try to extract main content
  const contentElement = document.querySelector('main, article, .content');
  if (contentElement) {
    rulesContent = contentElement.textContent?.trim() || '';
  }

  // Try to extract description
  const descriptionElement = document.querySelector('p:first-of-type');
  if (descriptionElement) {
    description = descriptionElement.textContent?.trim() || '';
  }

  return {
    rulesContent,
    description,
    imageUrl: ''
  };
}

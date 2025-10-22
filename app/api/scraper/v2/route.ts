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

interface GameData {
  name: string;
  releaseYear?: number;
  designer?: string;
  publisher?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playTime?: number;
  description?: string;
  rules?: string;
  imageUrl?: string;
}

interface ScrapedData {
  bggData?: Partial<GameData>;
  rulesPalData?: Partial<GameData>;
  combined: GameData;
}

function getWebsiteType(url: string): string {
  if (url.includes('boardgamegeek.com')) return 'bgg';
  if (url.includes('rulespal.com')) return 'rulespal';
  return 'unknown';
}

async function scrapeBGG(url: string): Promise<Partial<GameData>> {
  try {
    console.log('🎯 Scraping BGG:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`BGG fetch failed: ${response.status}`);
    }

    const html = await response.text();
    const gameData: Partial<GameData> = {};

    // Extract data from JavaScript variables
    try {
      // Extract GEEK.geekitemPreload data
      const geekItemMatch = html.match(/GEEK\.geekitemPreload\s*=\s*({.*?});/s);
      if (geekItemMatch) {
        const geekData = JSON.parse(geekItemMatch[1]);
        
        // Extract data from the root level of geekData.item
        if (geekData.item) {
          // Extract name
          if (geekData.item.name) {
            gameData.name = geekData.item.name;
          }
          
          // Extract year
          if (geekData.item.yearpublished) {
            gameData.releaseYear = parseInt(geekData.item.yearpublished);
          }
          
          // Extract min/max players
          if (geekData.item.minplayers) {
            gameData.minPlayers = parseInt(geekData.item.minplayers);
          }
          if (geekData.item.maxplayers) {
            gameData.maxPlayers = parseInt(geekData.item.maxplayers);
          }
          
          // Extract play time
          if (geekData.item.minplaytime) {
            gameData.playTime = parseInt(geekData.item.minplaytime);
          } else if (geekData.item.maxplaytime) {
            gameData.playTime = parseInt(geekData.item.maxplaytime);
          }
          
          // Extract description
          if (geekData.item.short_description) {
            gameData.description = geekData.item.short_description;
          }
          
          // Extract full description from the description field
          if (geekData.item.description) {
            // Clean HTML tags and get the full description
            const fullDesc = geekData.item.description
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .trim();
            
            if (fullDesc && fullDesc.length > 0) {
              gameData.description = fullDesc;
            }
          }
          
          // Extract designer and publisher from links
          if (geekData.item.links) {
            const links = geekData.item.links;
            
            // Get all designers
            if (links.boardgamedesigner && links.boardgamedesigner.length > 0) {
              gameData.designer = links.boardgamedesigner.map((designer: any) => designer.name).join(', ');
            }
            
            // Get all publishers
            if (links.boardgamepublisher && links.boardgamepublisher.length > 0) {
              gameData.publisher = links.boardgamepublisher.map((publisher: any) => publisher.name).join(', ');
            }
          }
        }
      }
    } catch (parseError) {
      console.warn('⚠️ Could not parse BGG JavaScript data:', parseError);
    }

    // Fallback: Try to extract from HTML if JavaScript parsing failed
    if (!gameData.name) {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Try to extract title from page title
      const titleElement = document.querySelector('title');
      if (titleElement) {
        const titleText = titleElement.textContent || '';
        const titleMatch = titleText.match(/^([^|]+)/);
        if (titleMatch) {
          gameData.name = titleMatch[1].trim();
        }
      }
    }

    console.log('✅ BGG data scraped:', gameData);
    return gameData;

  } catch (error) {
    console.error('❌ BGG scraping error:', error);
    return {};
  }
}

async function scrapeRulesPal(url: string): Promise<Partial<GameData>> {
  try {
    console.log('🎯 Scraping RulesPal:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`RulesPal fetch failed: ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const gameData: Partial<GameData> = {};

    // Extract rules content - try multiple selectors
    let rulesContent = document.querySelector('main') || 
                      document.querySelector('.content') || 
                      document.querySelector('.rulebook-content') ||
                      document.querySelector('article') ||
                      document.querySelector('.post-content');

    if (!rulesContent) {
      // Fallback: look for content with headings
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length > 0) {
        rulesContent = headings[0].parentElement;
      }
    }

    if (rulesContent) {
      // Convert HTML to clean markdown while preserving structure
      const rulesText = convertHtmlToMarkdown(rulesContent.innerHTML);
      gameData.rules = rulesText;
    } else {
      // Last resort: extract from body
      const bodyContent = document.querySelector('body');
      if (bodyContent) {
        const rulesText = convertHtmlToMarkdown(bodyContent.innerHTML);
        gameData.rules = rulesText;
      }
    }

    // Extract game image from the thumb URL pattern
    const gameName = extractGameNameFromUrl(url);
    if (gameName) {
      gameData.imageUrl = `https://www.rulespal.com/thumbs/${gameName}.jpg`;
    }

    console.log('✅ RulesPal data scraped:', { 
      rulesLength: gameData.rules?.length || 0,
      imageUrl: gameData.imageUrl 
    });
    return gameData;

  } catch (error) {
    console.error('❌ RulesPal scraping error:', error);
    return {};
  }
}

function extractGameNameFromUrl(url: string): string | null {
  try {
    const urlParts = url.split('/');
    const rulebookIndex = urlParts.findIndex(part => part === 'rulebook');
    if (rulebookIndex > 0) {
      return urlParts[rulebookIndex - 1];
    }
    return null;
  } catch (error) {
    return null;
  }
}

function convertHtmlToMarkdown(html: string): string {
  // Convert HTML to markdown with proper formatting
  let markdown = html
    // Convert headings
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n\n')
    // Convert bold and italic (HTML to markdown)
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // Convert lists
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gis);
      if (items) {
        return '\n' + items.map(item => 
          '- ' + item.replace(/<li[^>]*>(.*?)<\/li>/gis, '$1').replace(/<[^>]*>/g, '').trim()
        ).join('\n') + '\n\n';
      }
      return '';
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gis);
      if (items) {
        return '\n' + items.map((item, index) => 
          `${index + 1}. ` + item.replace(/<li[^>]*>(.*?)<\/li>/gis, '$1').replace(/<[^>]*>/g, '').trim()
        ).join('\n') + '\n\n';
      }
      return '';
    })
    // Convert paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n')
    // Convert line breaks
    .replace(/<br[^>]*>/gi, '\n')
    // Remove remaining HTML tags but preserve content
    .replace(/<[^>]*>/g, '')
    // Clean up HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Process markdown formatting in the final text
  markdown = processMarkdownFormatting(markdown);

  return markdown;
}

function processMarkdownFormatting(text: string): string {
  return text
    // Convert **bold** to <strong>bold</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>italic</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Handle nested formatting (bold within italic or vice versa)
    .replace(/<em><strong>(.*?)<\/strong><\/em>/g, '<em><strong>$1</strong></em>')
    .replace(/<strong><em>(.*?)<\/em><\/strong>/g, '<strong><em>$1</em></strong>');
}

function combineGameData(bggData: Partial<GameData>, rulesPalData: Partial<GameData>): GameData {
  return {
    name: bggData.name || 'Unknown Game',
    releaseYear: bggData.releaseYear,
    designer: bggData.designer,
    publisher: bggData.publisher,
    minPlayers: bggData.minPlayers,
    maxPlayers: bggData.maxPlayers,
    playTime: bggData.playTime,
    description: bggData.description,
    rules: rulesPalData.rules,
    imageUrl: rulesPalData.imageUrl,
  };
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

    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    const scrapedData: ScrapedData = {
      combined: {
        name: 'Unknown Game'
      }
    };

    // Process each URL
    for (const url of urls) {
      const websiteType = getWebsiteType(url);
      
      try {
        if (websiteType === 'bgg') {
          scrapedData.bggData = await scrapeBGG(url);
        } else if (websiteType === 'rulespal') {
          scrapedData.rulesPalData = await scrapeRulesPal(url);
        } else {
          console.warn('⚠️ Unknown website type for URL:', url);
        }
      } catch (error) {
        console.error(`❌ Error scraping ${url}:`, error);
      }
    }

    // Combine the data
    scrapedData.combined = combineGameData(
      scrapedData.bggData || {},
      scrapedData.rulesPalData || {}
    );

    console.log('🎉 Scraping completed:', {
      bggData: !!scrapedData.bggData,
      rulesPalData: !!scrapedData.rulesPalData,
      combinedName: scrapedData.combined.name
    });

    return NextResponse.json({
      success: true,
      data: scrapedData
    });

  } catch (error) {
    console.error('❌ Scraper error:', error);
    return NextResponse.json(
      { error: 'Scraping failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

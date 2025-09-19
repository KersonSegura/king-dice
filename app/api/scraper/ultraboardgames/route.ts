import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

export async function POST(request: NextRequest) {
  try {
    const { gameUrl, rulesUrl } = await request.json();
    
    if (!gameUrl) {
      return NextResponse.json(
        { error: 'Game URL is required' },
        { status: 400 }
      );
    }

    // Scrape basic game information
    const gameInfo = await scrapeGameInfo(gameUrl);
    
    // Scrape rules if URL provided
    let rulesContent = null;
    let fullDescription = gameInfo.fullDescription;
    
    if (rulesUrl) {
      const rulesData = await scrapeGameRules(rulesUrl);
      rulesContent = rulesData.rulesContent;
      
      // If we found a better description in the rules page, use it
      if (rulesData.description && rulesData.description.length > (fullDescription?.length || 0)) {
        fullDescription = rulesData.description;
        gameInfo.fullDescription = fullDescription;
      }
    }

    return NextResponse.json({
      success: true,
      gameInfo,
      rulesContent
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to scrape game information',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function scrapeGameInfo(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch game page: ${response.status}`);
  }
  
  const html = await response.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Extract game title
  const h1 = document.querySelector('h1');
  const title = h1 ? h1.textContent?.replace('Fan Site', '').trim() || '' : '';
  
  // Extract game information from the rating table
  const gameInfo: any = {
    title,
    nameEn: title,
    nameEs: title // Can be updated manually if needed
  };
  
  // Extract data from the rating table
  const tableRows = document.querySelectorAll('table tr');
  tableRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      const label = cells[0].textContent?.replace(':', '').trim().toLowerCase() || '';
      const value = cells[1].textContent?.trim() || '';
      
      switch (label) {
        case 'year':
          const yearMatch = value.match(/\d{4}/);
          if (yearMatch) {
            gameInfo.yearRelease = parseInt(yearMatch[0]);
          }
          break;
        case 'players':
          const playersMatch = value.match(/(\d+)-(\d+)/);
          if (playersMatch) {
            gameInfo.minPlayers = parseInt(playersMatch[1]);
            gameInfo.maxPlayers = parseInt(playersMatch[2]);
          } else {
            const singlePlayerMatch = value.match(/(\d+)/);
            if (singlePlayerMatch) {
              gameInfo.minPlayers = parseInt(singlePlayerMatch[1]);
              gameInfo.maxPlayers = parseInt(singlePlayerMatch[1]);
            }
          }
          break;
        case 'playing time':
          const timeMatch = value.match(/(\d+)-(\d+)/);
          if (timeMatch) {
            gameInfo.durationMinutes = parseInt(timeMatch[1]); // Use minimum time
          } else {
            const singleTimeMatch = value.match(/(\d+)/);
            if (singleTimeMatch) {
              gameInfo.durationMinutes = parseInt(singleTimeMatch[1]);
            }
          }
          break;
      }
    }
  });
  
  // Extract designer and publisher from paragraphs
  const paragraphs = document.querySelectorAll('p');
  paragraphs.forEach(p => {
    const text = p.textContent || '';
    
    if (text.includes('Created by:')) {
      const designerMatch = text.match(/Created by:\s*(.+)/);
      if (designerMatch) {
        gameInfo.designer = designerMatch[1].trim();
      }
    }
    
    if (text.includes('Published by:')) {
      const publisherMatch = text.match(/Published by:\s*(.+)/);
      if (publisherMatch) {
        gameInfo.developer = publisherMatch[1].trim();
      }
    }
  });
  
  // Extract description from the main game page
  const h3Elements = document.querySelectorAll('h3');
  for (const h3 of h3Elements) {
    if (h3.textContent?.includes('Description:')) {
      // Look for the next paragraph element that contains the actual description
      let nextElement = h3.nextElementSibling;
      while (nextElement) {
        if (nextElement.tagName === 'P') {
          const description = nextElement.textContent?.trim() || '';
          if (description.length > 50) { // Make sure it's substantial content
            gameInfo.fullDescription = description;
            break;
          }
        }
        nextElement = nextElement.nextElementSibling;
      }
      break;
    }
  }
  
  return gameInfo;
}

async function scrapeGameRules(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch rules page: ${response.status}`);
  }
  
  const html = await response.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  let rulesContent = '';
  let description = '';
  let foundDescription = false;
  
  // Look for the main content elements, but skip navigation areas
  const contentElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, strong, em, img');
  
  for (const element of contentElements) {
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim() || '';
    
    // Skip navigation, footer, and irrelevant content
    if (text.includes('Continue Reading') || 
        text.includes('Ultra BoardGames') || 
        text.includes('Privacy & Disclaimer') ||
        text.includes('© 2020') ||
        text.includes('Blog') ||
        text.includes('Categories') ||
        text.includes('Shops') ||
        text.includes('This site is dedicated to promoting board games') ||
        text.includes('Through extensive research') ||
        text.includes('Our mission is to produce engaging articles') ||
        text.includes('reviews, tips and tricks, game rules, strategies') ||
        text.includes('consider to buy the game') ||
        text.includes('These games deserve it') ||
        text.includes('Contact') ||
        element.closest('.menu, .navigation, .sidebar, .footer, nav, header')) {
      continue;
    }

    // Skip menu-like lists and navigation elements
    if (tagName === 'ul' || tagName === 'ol') {
      const listItems = element.querySelectorAll('li');
      const listTexts = Array.from(listItems).map(li => li.textContent?.trim() || '');
      
      // Skip if this looks like a navigation menu
      if (listTexts.some(item => 
        item.includes('Home') || 
        item.includes('Games') || 
        item.includes('Blog') ||
        item.includes('Categories') ||
        item.includes('Shops') ||
        item.includes('Overview') ||
        item.includes('Buy ') ||
        item.includes('Videos') ||
        item.includes('Other Games')
      )) {
        continue;
      }
    }

    // Skip standalone h4 elements that are likely menu items
    if (tagName === 'h4' && (
      text.includes('Overview') ||
      text.includes('Basic Game Rules') ||
      text.includes('Solo Play') ||
      text.includes('Buy ') ||
      text.includes('Videos') ||
      text.includes('Other Games')
    )) {
      continue;
    }

    // Skip logo images and navigation images
    if (tagName === 'img') {
      const imgElement = element as HTMLImageElement;
      const imgSrc = imgElement.src;
      if (imgSrc && (imgSrc.includes('logo.png') || imgSrc.includes('/img/logo'))) {
        continue;
      }
    }
    
    // Process different types of content
    switch (tagName) {
      case 'h1':
        // Skip the main title, but check if this starts the actual content
        if (text && text.includes('Game Rules')) {
          foundDescription = false; // We're past the description now
          rulesContent += `<${tagName}>${text}</${tagName}>\n\n`;
        }
        break;
        
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        if (text) {
          // Check if this is a section header that indicates we're past the description
          if (text.includes('Setup') || text.includes('Game Play') || text.includes('Scoring') || 
              text.includes('End of Game') || text.includes('Variant') || text.includes('Components')) {
            foundDescription = false; // Stop looking for description content
          }
          rulesContent += `<${tagName}>${text}</${tagName}>\n\n`;
        }
        break;
        
      case 'p':
        if (text && text.length > 10) { // Skip very short paragraphs
          // Skip footer content paragraphs
          if (text.includes('This site is dedicated to promoting') ||
              text.includes('Through extensive research') ||
              text.includes('Our mission is to produce') ||
              text.includes('reviews, tips and tricks') ||
              text.includes('consider to buy the game') ||
              text.includes('These games deserve it')) {
            break;
          }
          
          // Only capture description if it's early content and has story/background elements
          // Avoid setup instructions by being more specific
          if (!foundDescription && text.length > 100 && 
              (text.includes('Introduced by') || text.includes('Moors') || 
               text.includes('king Manuel') || text.includes('Alhambra') || 
               text.includes('palace') || text.includes('Portuguese')) &&
              !text.includes('Setup') && !text.includes('Give each player') && 
              !text.includes('Place the') && !text.includes('Fill the bag')) {
            if (!description) {
              description = text;
              foundDescription = true;
            } else if (description.length < 800 && !text.includes('Factory')) {
              description += ' ' + text;
            }
          }
          
          rulesContent += `<p>${text}</p>\n\n`;
        }
        break;
        
      case 'ul':
      case 'ol':
        if (element.children.length > 0) {
          rulesContent += `<${tagName}>\n`;
          const listItems = element.querySelectorAll('li');
          listItems.forEach(li => {
            const liText = li.textContent?.trim();
            if (liText) {
              rulesContent += `<li>${liText}</li>\n`;
            }
          });
          rulesContent += `</${tagName}>\n\n`;
        }
        break;
        
      case 'strong':
      case 'b':
        // Only add if not already inside a paragraph
        if (text && !element.closest('p')) {
          rulesContent += `<strong>${text}</strong>\n`;
        }
        break;
        
      case 'em':
      case 'i':
        // Only add if not already inside a paragraph
        if (text && !element.closest('p')) {
          rulesContent += `<em>${text}</em>\n`;
        }
        break;
        
      case 'img':
        const imgElement = element as HTMLImageElement;
        const imgSrc = imgElement.src;
        const imgAlt = imgElement.alt || 'Game image';
        if (imgSrc) {
          // Convert relative URLs to absolute
          const absoluteUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.ultraboardgames.com${imgSrc}`;
          
          // Try to fetch and convert image to base64 for the RichTextEditor
          try {
            const imageResponse = await fetch(absoluteUrl);
            if (imageResponse.ok) {
              const arrayBuffer = await imageResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
              const base64 = buffer.toString('base64');
              const dataUrl = `data:${contentType};base64,${base64}`;
              
              // Create an image placeholder that the RichTextEditor can handle
              const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              rulesContent += `[IMAGE:${imageId}]\n\n`;
              
              // Store the image data for later processing
              // Note: In a real implementation, you'd want to store this somewhere
              // For now, we'll use the markdown format as fallback
              rulesContent = rulesContent.replace(`[IMAGE:${imageId}]`, `![${imgAlt}](${dataUrl})`);
            } else {
              // Fallback to markdown if image fetch fails
              rulesContent += `![${imgAlt}](${absoluteUrl})\n\n`;
            }
          } catch (error) {
            // Fallback to markdown if anything fails
            rulesContent += `![${imgAlt}](${absoluteUrl})\n\n`;
          }
        }
        break;
    }
  }
  
  // Clean up the content
  rulesContent = rulesContent
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .trim();
  
  description = description.trim();
  
  return {
    rulesContent,
    description
  };
}

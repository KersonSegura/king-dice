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
      
      // If we found a slideshow image in the rules page, use it for both imageUrl and thumbnailUrl
      if (rulesData.slideshowImageUrl) {
        gameInfo.imageUrl = rulesData.slideshowImageUrl;
        gameInfo.thumbnailUrl = rulesData.slideshowImageUrl;
        console.log('✅ Found slideshow image:', rulesData.slideshowImageUrl);
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
  // Strategy 1: Look for heading with "Description:" and get following paragraphs
  const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let foundDescription = false;
  
  for (const heading of headingElements) {
    const headingText = heading.textContent?.trim() || '';
    console.log('Found heading:', headingText);
    
    if (headingText.includes('Description')) {
      console.log('Found Description heading!');
      // Collect all following paragraphs until we hit another heading or certain content
      let descriptionParts: string[] = [];
      let nextElement = heading.nextElementSibling;
      
      while (nextElement) {
        const tagName = nextElement.tagName?.toLowerCase();
        const elementText = nextElement.textContent?.trim() || '';
        console.log(`  Checking next element: ${tagName}, text length: ${elementText.length}`);
        
        // Stop if we hit another heading (likely a new section)
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          console.log('  Hit another heading, stopping');
          break;
        }
        
        // Stop if we hit a table, div with class, or horizontal rule
        if (['table', 'hr'].includes(tagName)) {
          console.log('  Hit table/hr, stopping');
          break;
        }
        
        // Collect paragraph content (no character limit)
        if (tagName === 'p') {
          const paragraphText = nextElement.textContent?.trim() || '';
          // Skip footer-like content only
          if (paragraphText.length > 0 &&
              !paragraphText.includes('Retail Price') &&
              !paragraphText.includes('Check These Posts') &&
              !paragraphText.includes('Continue Reading') &&
              !paragraphText.includes('Read More') &&
              !paragraphText.includes('Prices:') &&
              !paragraphText.includes('Expansions:')) {
            console.log('  Adding paragraph:', paragraphText.substring(0, 50) + '...');
            descriptionParts.push(paragraphText);
          } else if (paragraphText.length > 0) {
            console.log('  Skipping paragraph (footer or section marker)');
          }
        }
        
        nextElement = nextElement.nextElementSibling;
      }
      
      // Combine all description parts
      if (descriptionParts.length > 0) {
        gameInfo.fullDescription = descriptionParts.join('\n\n');
        foundDescription = true;
        console.log('✅ Found description:', gameInfo.fullDescription.substring(0, 100) + '...');
      }
      break;
    }
  }
  
  // Strategy 2: If no description found via heading, try looking in the main content area
  if (!foundDescription) {
    console.log('⚠️ No description found via heading, trying alternative method...');
    
    // Find the Description heading first to know where to start
    let descriptionHeading = null;
    for (const heading of headingElements) {
      if (heading.textContent?.includes('Description')) {
        descriptionHeading = heading;
        break;
      }
    }
    
    if (descriptionHeading) {
      console.log('Found Description heading, collecting only paragraphs in that section');
      let descriptionParts: string[] = [];
      let currentElement = descriptionHeading.nextElementSibling;
      
      while (currentElement) {
        const tagName = currentElement.tagName?.toLowerCase();
        const text = currentElement.textContent?.trim() || '';
        
        // Stop if we encounter "Prices:" or similar section markers
        if (text.includes('Prices:') || text.includes('Expansions:') || 
            text.includes('Check These Posts') || text.includes('Retail Price')) {
          console.log('  Encountered Prices/Expansions section, stopping');
          break;
        }
        
        // Stop if we hit another heading (new section)
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          console.log('  Hit next section heading:', text.substring(0, 30));
          break;
        }
        
        // Stop if we hit a table (usually Prices table)
        if (tagName === 'table') {
          console.log('  Hit table, stopping');
          break;
        }
        
        // Stop if we hit horizontal rule (section divider)
        if (tagName === 'hr') {
          console.log('  Hit horizontal rule, stopping');
          break;
        }
        
        // Check if this is a div container (like whitebox) - look inside it for paragraphs
        if (tagName === 'div') {
          console.log('  Found div container, looking inside for paragraphs');
          const paragraphsInDiv = currentElement.querySelectorAll('p');
          for (const p of paragraphsInDiv) {
            const paragraphText = p.textContent?.trim() || '';
            if (paragraphText.length > 0) {
              descriptionParts.push(paragraphText);
              console.log('  Adding paragraph from div:', paragraphText.substring(0, 50) + '...');
            }
          }
          // If we found paragraphs in the div, we can stop looking for more
          if (paragraphsInDiv.length > 0) {
            break;
          }
        }
        
        // Collect paragraph content directly (no character limit)
        if (tagName === 'p' && text.length > 0) {
          // Skip footer-like content
          if (!text.includes('This site is dedicated') && 
              !text.includes('Our mission') && 
              !text.includes('Created by') &&
              !text.includes('Published by') &&
              !text.includes('Read More') &&
              !text.includes('Continue Reading')) {
            descriptionParts.push(text);
            console.log('  Adding paragraph:', text.substring(0, 50) + '...');
          }
        }
        
        currentElement = currentElement.nextElementSibling;
      }
      
      if (descriptionParts.length > 0) {
        gameInfo.fullDescription = descriptionParts.join('\n\n');
        console.log('✅ Found description:', gameInfo.fullDescription.substring(0, 100) + '...');
      }
    } else {
      // Fallback: Look for content paragraphs
      console.log('No Description heading found, using fallback method');
      const allParagraphs = document.querySelectorAll('p');
      let descriptionParts: string[] = [];
      
      for (const p of allParagraphs) {
        const text = p.textContent?.trim() || '';
        
        // Only collect content paragraphs, skip footer and metadata (no character limit)
        if (text.length > 0 && 
            !text.includes('This site is dedicated') && 
            !text.includes('Our mission') && 
            !text.includes('Created by') &&
            !text.includes('Published by') &&
            !text.includes('Retail Price') && 
            !text.includes('Read More') &&
            !descriptionParts.length) {
          descriptionParts.push(text);
          break; // Just take the first content paragraph as fallback
        }
      }
      
      if (descriptionParts.length > 0) {
        gameInfo.fullDescription = descriptionParts.join('\n\n');
        console.log('✅ Found description via fallback:', gameInfo.fullDescription.substring(0, 100) + '...');
      } else {
        console.log('❌ Could not find description');
      }
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
  
  // Add credits to UltraBoardGames.com at the end
  if (rulesContent) {
    rulesContent += '\n\n---\n\n<em>Rules source: UltraBoardGames.com</em>';
  }
  
  description = description.trim();
  
  // Extract slideshow image URL if present
  let slideshowImageUrl = null;
  const allImages = document.querySelectorAll('img');
  for (const img of allImages) {
    const imgElement = img as HTMLImageElement;
    const imgSrc = imgElement.src;
    
    // Look for images in the /img/slideshow/ directory
    if (imgSrc && imgSrc.includes('/img/slideshow/')) {
      // Convert relative URLs to absolute
      slideshowImageUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.ultraboardgames.com${imgSrc}`;
      console.log('🖼️ Found slideshow image:', slideshowImageUrl);
      break; // Take the first slideshow image found
    }
  }
  
  return {
    rulesContent,
    description,
    slideshowImageUrl
  };
}

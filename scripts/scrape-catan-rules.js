const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCatanRules() {
  try {
    console.log('🔍 Scraping Catan official website for rules...\n');
    
    // Try different Catan website URLs
    const urls = [
      'https://www.catan.com/game/catan',
      'https://www.catan.com/game/catan/rules',
      'https://www.catan.com/game/catan/how-to-play',
      'https://www.catan.com/game/catan/instructions'
    ];
    
    for (const url of urls) {
      try {
        console.log(`\n🔍 Trying: ${url}`);
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        console.log(`Response length: ${response.data.length} characters`);
        
        // Look for various rule content selectors
        const selectors = [
          '.rules-content',
          '.game-rules', 
          '.instructions',
          '.how-to-play',
          '.gameplay',
          '.setup',
          '.rules',
          '[class*="rule"]',
          '[class*="instruction"]',
          '[class*="gameplay"]',
          'p', // All paragraphs as fallback
          'div' // All divs as fallback
        ];
        
        let foundContent = false;
        
        for (const selector of selectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
            
            // Get text content
            const text = elements.text().trim();
            if (text.length > 100) {
              console.log(`📝 Content length: ${text.length} characters`);
              console.log(`📖 Preview: ${text.substring(0, 300)}...`);
              foundContent = true;
              
              // If this looks like rules content, save it
              if (text.toLowerCase().includes('setup') || 
                  text.toLowerCase().includes('rules') || 
                  text.toLowerCase().includes('how to play') ||
                  text.toLowerCase().includes('gameplay')) {
                console.log(`🎯 This looks like rules content!`);
                return text;
              }
            }
          }
        }
        
        if (!foundContent) {
          console.log('❌ No substantial content found with any selector');
        }
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Error with ${url}: ${error.message}`);
      }
    }
    
    console.log('\n❌ No rules content found on any Catan website URL');
    return null;
    
  } catch (error) {
    console.error('Error scraping Catan rules:', error.message);
    return null;
  }
}

async function main() {
  const rules = await scrapeCatanRules();
  if (rules) {
    console.log('\n✅ Successfully extracted Catan rules!');
    console.log(`Total length: ${rules.length} characters`);
  } else {
    console.log('\n❌ Failed to extract Catan rules');
  }
}

main();

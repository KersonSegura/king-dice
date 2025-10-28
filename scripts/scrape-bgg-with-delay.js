const axios = require('axios');
const fs = require('fs');

async function scrapeWithDelay() {
  try {
    // Try to get the actual API endpoint that BGG uses
    console.log('🔍 Trying to find BGG API endpoint...\n');
    
    // Wait 2 seconds after initial load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try the geekdo API with proper format
    const apiUrl = 'https://boardgamegeek.com/geekhot.php?go=geekhot';
    
    console.log('Fetching:', apiUrl);
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      maxRedirects: 5
    });
    
    fs.writeFileSync('scripts/bgg-api-response.html', response.data);
    console.log('✅ Saved response to bgg-api-response.html');
    console.log(`Response length: ${response.data.length} chars`);
    
    // Check for actual data
    if (response.data.includes('boardgame') || response.data.includes('<item')) {
      console.log('✅ Found game data!');
    } else {
      console.log('❌ No game data found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

scrapeWithDelay();



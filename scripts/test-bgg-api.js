const axios = require('axios');

async function testBGGAPI() {
  console.log('🔍 Testing different BGG API endpoints...\n');

  const endpoints = [
    { name: 'XML API Hotness', url: 'https://boardgamegeek.com/xmlapi2/hot?type=boardgame' },
    { name: 'XML API Thing (with auth bearer)', url: 'https://boardgamegeek.com/xmlapi2/thing?id=1&stats=1' },
    { name: 'Geekdo API Hotness (browser endpoint)', url: 'https://boardgamegeek.com/geekhot.php?ajax=1&rowstart=0&rowend=50' },
    { name: 'Geekdo API Collection', url: 'https://boardgamegeek.com/xmlapi2/collection?username=tomnoddy' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      console.log(`URL: ${endpoint.url}`);
      
      const response = await axios.get(endpoint.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/xml, text/xml, */*'
        }
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`✅ Content-Type: ${response.headers['content-type']}`);
      console.log(`✅ Data length: ${response.data.length} chars`);
      
      if (response.data.length < 500) {
        console.log(`Data preview: ${response.data.substring(0, 300)}...\n`);
      } else {
        console.log(`Data too large to preview\n`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status || error.code}`);
      console.log(`   Message: ${error.message}\n`);
    }
  }

  console.log('\n📝 Trying to parse the hotness page HTML directly...');
  try {
    const response = await axios.get('https://boardgamegeek.com/hotness', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Look for JSON data in the page
    const jsonMatch = response.data.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s);
    if (jsonMatch) {
      console.log('✅ Found __INITIAL_STATE__ JSON data!');
      const data = JSON.parse(jsonMatch[1]);
      console.log('Keys:', Object.keys(data).slice(0, 10));
    } else {
      console.log('❌ No __INITIAL_STATE__ found in HTML');
    }

    // Look for games array
    const gamesMatch = response.data.match(/games?\s*:\s*\[(.*?)\]/s);
    if (gamesMatch) {
      console.log('✅ Found games array in HTML');
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testBGGAPI();



const axios = require('axios');

async function testWithLogin() {
  try {
    const username = process.env.BGG_USERNAME;
    const password = process.env.BGG_PASSWORD;
    
    console.log('🔐 Logging into BGG...');
    
    // Step 1: Login to get session cookies
    const loginResponse = await axios.post(
      'https://boardgamegeek.com/login/api/v1',
      {
        credentials: {
          username,
          password
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    // Extract cookies
    const setCookieHeaders = loginResponse.headers['set-cookie'] || [];
    console.log('✅ Login successful!');
    console.log(`🍪 Received ${setCookieHeaders.length} cookies`);
    
    // Build cookie string
    let cookieString = '';
    for (const cookie of setCookieHeaders) {
      const cookieValue = cookie.split(';')[0];
      if (cookieValue) {
        cookieString += (cookieString ? '; ' : '') + cookieValue;
      }
    }
    
    console.log(`Cookies: ${cookieString.substring(0, 100)}...\n`);
    
    // Step 2: Try to access the hot endpoint
    console.log('📡 Fetching hot games...');
    const hotResponse = await axios.get(
      'https://boardgamegeek.com/xmlapi2/hot?type=boardgame',
      {
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/xml, text/xml, */*'
        }
      }
    );
    
    console.log(`✅ Status: ${hotResponse.status}`);
    console.log(`✅ Content length: ${hotResponse.data.length} chars\n`);
    
    // Parse the XML
    const xml = hotResponse.data;
    const items = xml.match(/<item[^>]*>/g);
    
    console.log(`✅ Found ${items?.length || 0} games\n`);
    
    if (items && items.length > 0) {
      console.log('Top 10 games:');
      items.slice(0, 10).forEach((item) => {
        const idMatch = item.match(/id="(\d+)"/);
        const rankMatch = item.match(/rank="(\d+)"/);
        const nameMatch = item.match(/name="([^"]+)"/);
        if (idMatch && rankMatch) {
          console.log(`  ${rankMatch[1]}. BGG ID: ${idMatch[1]} ${nameMatch ? ' - ' + nameMatch[1] : ''}`);
        }
      });
    }
    
    // Save the full response
    const fs = require('fs');
    fs.writeFileSync('scripts/bgg-hot-result.xml', xml);
    console.log('\n✅ Saved full response to bgg-hot-result.xml');
    
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.code}`);
    console.log(`   Message: ${error.message}`);
    
    if (error.response) {
      console.log(`   Response headers:`, Object.keys(error.response.headers));
      if (error.response.data) {
        console.log(`   Response data: ${error.response.data.substring(0, 200)}`);
      }
    }
  }
}

testWithLogin();



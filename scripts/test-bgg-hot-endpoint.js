const axios = require('axios');

async function loginToBGG() {
  // First, try to login to get session cookies
  // Note: This is a simplified example - you'll need valid credentials
  const loginUrl = 'https://boardgamegeek.com/login/api/v1';
  
  try {
    console.log('🔐 Attempting login...');
    const loginResponse = await axios.post(
      loginUrl,
      {
        credentials: {
          username: process.env.BGG_USERNAME || 'your_username',
          password: process.env.BGG_PASSWORD || 'your_password'
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    // Extract cookies from response
    const cookies = loginResponse.headers['set-cookie'] || [];
    console.log('✅ Login successful');
    
    return cookies.map(cookie => cookie.split(';')[0]).join('; ');
    
  } catch (error) {
    console.log(`❌ Login failed: ${error.response?.status || error.message}`);
    console.log('💡 Note: You need to set BGG_USERNAME and BGG_PASSWORD environment variables');
    console.log('   Or this endpoint might require interactive login/session');
    return null;
  }
}

async function testHotEndpoint() {
  try {
    console.log('🔍 Testing BGG Hot endpoint...\n');

    // Get authentication cookies
    const cookieString = await loginToBGG();
    
    // Try the hot endpoint from the documentation
    const url = 'https://boardgamegeek.com/xmlapi2/hot?type=boardgame';
    
    console.log(`\n📡 Fetching: ${url}`);
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/xml, text/xml, */*'
    };
    
    if (cookieString) {
      headers['Cookie'] = cookieString;
      console.log('🍪 Using authentication cookies');
    }
    
    const response = await axios.get(url, { headers });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Content-Type: ${response.headers['content-type']}`);
    console.log(`✅ Data length: ${response.data.length} chars\n`);
    
    // Parse XML
    const xml = response.data;
    console.log('First 1000 chars:');
    console.log(xml.substring(0, 1000));
    
    // Extract game info
    const items = xml.match(/<item[^>]*>/g);
    console.log(`\n✅ Found ${items?.length || 0} games`);
    
    if (items) {
      items.slice(0, 10).forEach((item, index) => {
        const idMatch = item.match(/id="(\d+)"/);
        const rankMatch = item.match(/rank="(\d+)"/);
        if (idMatch && rankMatch) {
          console.log(`${rankMatch[1]}. BGG ID: ${idMatch[1]}`);
        }
      });
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.code}`);
    console.log(`   Message: ${error.message}`);
    if (error.response?.status === 401) {
      console.log('\n💡 401 Unauthorized - BGG now requires authentication');
      console.log('   Solution: You need to login with a BGG account to get session cookies');
    }
  }
}

testHotEndpoint();


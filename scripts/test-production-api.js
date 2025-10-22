const https = require('https');

function testAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

async function testProduction() {
  console.log('🔍 Testing production API for game 8816...\n');
  
  try {
    // Test the API endpoint
    const result = await testAPI('https://kingdice.gg/api/games/8816');
    
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('\n✅ SUCCESS! Game found in production');
    } else if (result.status === 404) {
      console.log('\n❌ GAME NOT FOUND in production API');
      console.log('This means Vercel is NOT using the same database as local!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProduction();


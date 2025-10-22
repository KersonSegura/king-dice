const https = require('https');

function testProductionAPI() {
  const options = {
    hostname: 'kingdice.gg',
    path: '/api/games/8816',
    method: 'GET',
    headers: {
      'User-Agent': 'Node.js Test'
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\nResponse body:');
      console.log(data);
      
      try {
        const json = JSON.parse(data);
        console.log('\nParsed JSON:');
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Not valid JSON - likely HTML error page');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.end();
}

testProductionAPI();

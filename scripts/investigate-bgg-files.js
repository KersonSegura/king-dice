const axios = require('axios');

async function investigateBGGFiles() {
  console.log('🔍 Investigating BGG Files API...\n');

  const gameId = 429861; // Ace of Spades
  
  // Test 1: Standard thing API
  console.log('1️⃣ Testing standard thing API...');
  try {
    const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`);
    const hasFiles = response.data.includes('files');
    console.log(`   Contains 'files': ${hasFiles ? '✅' : '❌'}`);
    
    if (hasFiles) {
      const filesIndex = response.data.indexOf('files');
      const context = response.data.substring(filesIndex - 50, filesIndex + 100);
      console.log(`   Context around 'files': ${context}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Try to access files page directly
  console.log('\n2️⃣ Testing direct files page access...');
  try {
    const filesResponse = await axios.get(`https://boardgamegeek.com/boardgame/${gameId}/files`);
    console.log(`   Status: ${filesResponse.status}`);
    console.log(`   Content length: ${filesResponse.data.length}`);
    
    // Look for PDF links
    const pdfLinks = filesResponse.data.match(/href="[^"]*\.pdf[^"]*"/g);
    if (pdfLinks) {
      console.log(`   Found PDF links: ${pdfLinks.length}`);
      pdfLinks.slice(0, 3).forEach(link => console.log(`     ${link}`));
    } else {
      console.log('   No PDF links found');
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: Try different API endpoints
  console.log('\n3️⃣ Testing different API endpoints...');
  
  const endpoints = [
    `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&files=1`,
    `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&type=boardgame&files=1`,
    `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&type=boardgame&stats=1&files=1`
  ];

  for (let i = 0; i < endpoints.length; i++) {
    try {
      console.log(`   Testing endpoint ${i + 1}: ${endpoints[i]}`);
      const response = await axios.get(endpoints[i]);
      const hasFiles = response.data.includes('files');
      console.log(`     Contains 'files': ${hasFiles ? '✅' : '❌'}`);
      
      if (hasFiles) {
        const filesIndex = response.data.indexOf('files');
        const context = response.data.substring(filesIndex - 30, filesIndex + 50);
        console.log(`     Context: ${context}`);
      }
    } catch (error) {
      console.log(`     Error: ${error.message}`);
    }
  }

  // Test 4: Check if there's a specific files API
  console.log('\n4️⃣ Testing for dedicated files API...');
  try {
    const filesApiResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/files?id=${gameId}`);
    console.log(`   Files API status: ${filesApiResponse.status}`);
    console.log(`   Content length: ${filesApiResponse.data.length}`);
    
    if (filesApiResponse.data.length > 100) {
      console.log('   Files API exists! 🎉');
      console.log(`   First 200 chars: ${filesApiResponse.data.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   Files API error: ${error.message}`);
  }

  console.log('\n🎯 Investigation complete!');
}

investigateBGGFiles().catch(console.error);

const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🔍 Testing local API route: http://localhost:3000/api/games/8974');
    
    const response = await fetch('http://localhost:3000/api/games/8974');
    const data = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    if (data.game) {
      console.log('✅ Game found!');
      console.log('📝 Name (EN):', data.game.nameEn);
      console.log('📝 Name (ES):', data.game.nameEs);
      console.log('📄 Descriptions:', data.game.descriptions?.length || 0);
      console.log('📋 Rules:', data.game.rules?.length || 0);
    } else {
      console.log('❌ Game not found or error occurred');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testAPI();

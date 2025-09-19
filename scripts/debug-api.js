const axios = require('axios');

async function debugAPI() {
  try {
    console.log('🔍 Testing the boardgames API...\n');
    
    const response = await axios.get('http://localhost:3000/api/boardgames');
    const data = response.data;
    
    console.log('✅ API Response received');
    console.log(`📊 Total games: ${data.games ? data.games.length : 'No games array'}`);
    
    if (data.games && data.games.length > 0) {
      console.log('\n🔍 First 3 games details:');
      
      data.games.slice(0, 3).forEach((game, index) => {
        console.log(`\n--- Game ${index + 1}: ${game.nameEn} ---`);
        console.log(`ID: ${game.id}`);
        console.log(`Year: ${game.yearRelease}`);
        console.log(`Designer: ${game.designer || 'null'}`);
        console.log(`Developer: ${game.developer || 'null'}`);
        
        // Check descriptions
        if (game.descriptions && game.descriptions.length > 0) {
          console.log(`✅ Descriptions: ${game.descriptions.length}`);
          game.descriptions.forEach((desc, descIndex) => {
            console.log(`  Description ${descIndex + 1}:`);
            console.log(`    Language: ${desc.language || 'unknown'}`);
            console.log(`    Short EN: ${desc.shortDescriptionEn ? `${desc.shortDescriptionEn.substring(0, 50)}...` : 'null'}`);
            console.log(`    Full EN: ${desc.fullDescriptionEn ? `${desc.fullDescriptionEn.substring(0, 50)}...` : 'null'}`);
          });
        } else {
          console.log('❌ No descriptions array or empty');
        }
        
        // Check rules
        if (game.rules && game.rules.length > 0) {
          console.log(`✅ Rules: ${game.rules.length}`);
          game.rules.forEach((rule, ruleIndex) => {
            console.log(`  Rule ${ruleIndex + 1}:`);
            console.log(`    Language: ${rule.language}`);
            console.log(`    Text length: ${rule.rulesText ? rule.rulesText.length : 'null'}`);
          });
        } else {
          console.log('❌ No rules array or empty');
        }
      });
    } else {
      console.log('❌ No games data found');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

debugAPI();

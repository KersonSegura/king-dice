const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function debugMultipleDescriptions() {
  try {
    // Test with multiple games to see description patterns
    const testGameIds = ['429861', '420033', '425549', '436217', '359871'];
    
    for (const gameId of testGameIds) {
      console.log(`\n=== Game ID: ${gameId} ===`);
      
      try {
        const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`);
        
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '',
          textNodeName: '_text'
        });
        
        const data = parser.parse(response.data);
        
        if (data.items && data.items.item) {
          const game = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
          
          const gameName = Array.isArray(game.name) ? game.name.find(n => n.type === 'primary')?.value : game.name?.value;
          console.log(`Game: ${gameName || 'Unknown'}`);
          
          if (game.description) {
            console.log(`✅ Has description: ${game.description.length} characters`);
            console.log(`Preview: ${game.description.substring(0, 100)}...`);
          } else {
            console.log(`❌ No description found`);
          }
          
        }
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error fetching game ${gameId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugMultipleDescriptions();

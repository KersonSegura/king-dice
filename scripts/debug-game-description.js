const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function debugGameDescription() {
  try {
    // Test with a few games to see their description structure
    const testGameIds = ['429861', '420033', '425549']; // Ace of Spades, Vantage, Moon Colony Bloodbath
    
    for (const gameId of testGameIds) {
      console.log(`\n=== Debugging Game ID: ${gameId} ===`);
      
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
          
          console.log(`Game: ${game.name?.value || 'Unknown'}`);
          console.log(`Available fields:`, Object.keys(game));
          
          // Check for description-related fields
          if (game.description) {
            console.log(`\n📝 Description field found:`);
            console.log(`Type: ${typeof game.description}`);
            if (game.description.value) {
              const desc = game.description.value;
              console.log(`Length: ${desc.length} characters`);
              console.log(`Preview: ${desc.substring(0, 200)}...`);
            }
          }
          
          // Check for other potential description fields
          const descriptionFields = ['description', 'summary', 'overview', 'text', 'content'];
          descriptionFields.forEach(field => {
            if (game[field]) {
              console.log(`\n🔍 Found field: ${field}`);
              console.log(`Type: ${typeof game[field]}`);
              if (game[field].value) {
                console.log(`Value length: ${game[field].value.length}`);
                console.log(`Preview: ${game[field].value.substring(0, 100)}...`);
              }
            }
          });
          
          // Check for any other text fields that might contain descriptions
          Object.keys(game).forEach(key => {
            if (key.toLowerCase().includes('desc') || key.toLowerCase().includes('text') || key.toLowerCase().includes('content')) {
              console.log(`\n🔍 Potential description field: ${key}`);
              console.log(`Type: ${typeof game[key]}`);
              if (game[key] && game[key].value) {
                console.log(`Value: ${game[key].value.substring(0, 100)}...`);
              }
            }
          });
          
        } else {
          console.log(`❌ No game data found for ID ${gameId}`);
        }
        
        // Wait a bit between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error fetching game ${gameId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugGameDescription();

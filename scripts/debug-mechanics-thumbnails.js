const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function debugMechanicsThumbnails() {
  try {
    console.log('🔍 Debugging Mechanics and Thumbnails extraction from BGG...\n');
    
    // Test with a few games
    const testGameIds = [
      '429861', // Ace of Spades
      '143096', // Camp Grizzly
      '167791'  // Terraforming Mars
    ];
    
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
          
          // Check thumbnail
          console.log(`\n🖼️  THUMBNAIL CHECK:`);
          if (game.thumbnail) {
            console.log(`✅ Thumbnail field exists`);
            console.log(`   Raw thumbnail data:`, JSON.stringify(game.thumbnail, null, 2));
            if (game.thumbnail.value) {
              console.log(`   ✅ Thumbnail value: ${game.thumbnail.value.substring(0, 100)}...`);
            } else {
              console.log(`   ❌ No thumbnail value`);
            }
          } else {
            console.log(`❌ No thumbnail field`);
          }
          
          // Check mechanics
          console.log(`\n⚙️  MECHANICS CHECK:`);
          if (game.link) {
            const links = Array.isArray(game.link) ? game.link : [game.link];
            const mechanicLinks = links.filter(l => l.type === 'boardgamemechanic');
            
            console.log(`📊 Total links: ${links.length}`);
            console.log(`📊 Mechanic links: ${mechanicLinks.length}`);
            
            if (mechanicLinks.length > 0) {
              console.log(`✅ Mechanics found:`);
              mechanicLinks.forEach((link, index) => {
                console.log(`   ${index + 1}. ${link.value} (ID: ${link.id})`);
              });
            } else {
              console.log(`❌ No mechanic links found`);
              
              // Show all link types for debugging
              const linkTypes = [...new Set(links.map(l => l.type))];
              console.log(`🔍 All link types: ${linkTypes.join(', ')}`);
            }
          } else {
            console.log(`❌ No link array found`);
          }
          
        } else {
          console.log(`❌ No game data found for ID ${gameId}`);
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error fetching game ${gameId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugMechanicsThumbnails();

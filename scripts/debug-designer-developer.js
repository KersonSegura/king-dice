const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function debugDesignerDeveloper() {
  try {
    console.log('🔍 Debugging Designer/Developer extraction from BGG...\n');
    
    // Test with games that have and don't have designer/developer
    const testGameIds = [
      '429861', // Ace of Spades - HAS designer/developer
      '143096', // Camp Grizzly - MISSING designer/developer
      '167791'  // Terraforming Mars - HAS designer/developer
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
          
          // Check link array structure
          if (game.link) {
            const links = Array.isArray(game.link) ? game.link : [game.link];
            console.log(`\n📊 Link array has ${links.length} items`);
            
            // Find designer
            const designerLink = links.find(l => l.type === 'boardgamedesigner');
            if (designerLink) {
              console.log(`✅ Designer found: ${designerLink.value}`);
            } else {
              console.log(`❌ No designer link found`);
            }
            
            // Find developer/publisher
            const developerLink = links.find(l => l.type === 'boardgamepublisher');
            if (developerLink) {
              console.log(`✅ Developer/Publisher found: ${developerLink.value}`);
            } else {
              console.log(`❌ No developer/publisher link found`);
            }
            
            // Show all link types for debugging
            const linkTypes = [...new Set(links.map(l => l.type))];
            console.log(`\n🔍 All link types found: ${linkTypes.join(', ')}`);
            
            // Show first few links in detail
            console.log(`\n📋 First 3 links detail:`);
            links.slice(0, 3).forEach((link, index) => {
              console.log(`   ${index + 1}. Type: ${link.type}, Value: ${link.value}, ID: ${link.id}`);
            });
            
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

debugDesignerDeveloper();

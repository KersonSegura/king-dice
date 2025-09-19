const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function debugDescriptionContent() {
  try {
    // Test with one game to see the exact description structure
    const gameId = '429861'; // Ace of Spades
    
    console.log(`\n=== Debugging Description for Game ID: ${gameId} ===`);
    
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
      
      // Examine the description field in detail
      console.log(`\n📝 Description field examination:`);
      console.log(`Description type: ${typeof game.description}`);
      console.log(`Description value:`, game.description);
      
      if (typeof game.description === 'string') {
        console.log(`\n📄 Description as string:`);
        console.log(`Length: ${game.description.length} characters`);
        console.log(`Content: ${game.description.substring(0, 500)}...`);
      } else if (game.description && typeof game.description === 'object') {
        console.log(`\n📄 Description as object:`);
        console.log(`Keys:`, Object.keys(game.description));
        console.log(`Full object:`, JSON.stringify(game.description, null, 2));
      }
      
      // Also check the raw XML to see how description is structured
      console.log(`\n🔍 Raw XML structure for description:`);
      const rawXml = response.data;
      const descriptionMatch = rawXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      if (descriptionMatch) {
        console.log(`Found description tag: ${descriptionMatch[0].substring(0, 200)}...`);
      } else {
        console.log(`No description tag found in raw XML`);
      }
      
    } else {
      console.log(`❌ No game data found for ID ${gameId}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugDescriptionContent();

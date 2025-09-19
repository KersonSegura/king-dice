const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function debugGameDetails() {
  try {
    // Test with a specific game ID that we know exists
    const gameId = '429861'; // Ace of Spades
    console.log(`Fetching detailed info for game ${gameId}...`);
    
    const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`);
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
    
    const data = parser.parse(response.data);
    console.log('\nParsed data structure:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.items && data.items.item) {
      const game = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
      
      console.log('\nGame structure:');
      console.log(JSON.stringify(game, null, 2));
      
      if (game.links) {
        console.log('\nLinks found:');
        const links = Array.isArray(game.links) ? game.links : [game.links];
        links.forEach((link, i) => {
          console.log(`Link ${i}: type=${link.type}, value=${link.value}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugGameDetails();

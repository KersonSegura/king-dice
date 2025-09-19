const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function debugBGG() {
  try {
    console.log('Fetching hot games from BGG...');
    const response = await axios.get('https://boardgamegeek.com/xmlapi2/hot?boardgame');
    
    console.log('Raw response length:', response.data.length);
    console.log('First 1000 characters:');
    console.log(response.data.substring(0, 1000));
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
    
    const data = parser.parse(response.data);
    console.log('\nParsed data structure:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.items && data.items.item) {
      const firstGame = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
      console.log('\nFirst game structure:');
      console.log(JSON.stringify(firstGame, null, 2));
      
      if (firstGame.name) {
        console.log('\nName field types:');
        console.log('name type:', typeof firstGame.name);
        console.log('name is array:', Array.isArray(firstGame.name));
        if (Array.isArray(firstGame.name)) {
          firstGame.name.forEach((n, i) => {
            console.log(`name[${i}]:`, n);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugBGG();

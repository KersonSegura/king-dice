const axios = require('axios');

async function debugBGGRules() {
  try {
    console.log('🔍 Debugging BGG rule extraction...\n');
    
    // Search for Catan
    const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=Catan&type=boardgame`;
    console.log(`Searching: ${searchUrl}`);
    
    const searchResponse = await axios.get(searchUrl);
    console.log('Search response length:', searchResponse.data.length);
    
    // Extract game ID
    const gameIdMatch = searchResponse.data.match(/id="(\d+)"/);
    if (gameIdMatch) {
      const gameId = gameIdMatch[1];
      console.log(`Found game ID: ${gameId}`);
      
      // Get game details
      const gameUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
      console.log(`\nFetching game details: ${gameUrl}`);
      
      const gameResponse = await axios.get(gameUrl);
      console.log('Game response length:', gameResponse.data.length);
      
      // Look for different content types
      console.log('\n🔍 Analyzing BGG response content...');
      
      const content = gameResponse.data;
      
      // Check for description
      const descMatch = content.match(/<description[^>]*>(.*?)<\/description>/s);
      if (descMatch) {
        console.log(`✅ Description found (${descMatch[1].length} characters)`);
        console.log('Preview:', descMatch[1].substring(0, 300));
      } else {
        console.log('❌ No description found');
      }
      
      // Check for rules
      const rulesMatch = content.match(/<rules[^>]*>(.*?)<\/rules>/s);
      if (rulesMatch) {
        console.log(`✅ Rules found (${rulesMatch[1].length} characters)`);
        console.log('Preview:', rulesMatch[1].substring(0, 300));
      } else {
        console.log('❌ No rules found');
      }
      
      // Check for instructions
      const instructionsMatch = content.match(/<instructions[^>]*>(.*?)<\/instructions>/s);
      if (instructionsMatch) {
        console.log(`✅ Instructions found (${instructionsMatch[1].length} characters)`);
        console.log('Preview:', instructionsMatch[1].substring(0, 300));
      } else {
        console.log('❌ No instructions found');
      }
      
      // Check for other potential fields
      const otherFields = ['howtoplay', 'gameplay', 'setup', 'victory'];
      otherFields.forEach(field => {
        const match = content.match(new RegExp(`<${field}[^>]*>(.*?)<\/${field}>`, 's'));
        if (match) {
          console.log(`✅ ${field} found (${match[1].length} characters)`);
        }
      });
      
      // Look for file attachments (rulebook PDFs)
      const fileMatch = content.match(/<file[^>]*>(.*?)<\/file>/s);
      if (fileMatch) {
        console.log(`✅ File attachment found (${fileMatch[1].length} characters)`);
      } else {
        console.log('❌ No file attachments found');
      }
      
      // Check for links to external rulebooks
      const linkMatch = content.match(/<link[^>]*type="boardgamefile"[^>]*>(.*?)<\/link>/s);
      if (linkMatch) {
        console.log(`✅ Board game file link found (${linkMatch[1].length} characters)`);
      } else {
        console.log('❌ No board game file links found');
      }
      
    } else {
      console.log('❌ No game ID found in search response');
    }
    
  } catch (error) {
    console.error('Error debugging BGG rules:', error.message);
  }
}

debugBGGRules();

const axios = require('axios');
const fs = require('fs').promises;

async function debugUltraBGPage(gameSlug) {
  const url = `https://ultraboardgames.com/${gameSlug}/game-rules.php`;
  
  console.log(`🔍 Debugging UltraBoardGames page: ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Save raw HTML for inspection
    await fs.writeFile(`debug_${gameSlug}.html`, response.data, 'utf-8');
    console.log(`💾 Raw HTML saved to debug_${gameSlug}.html`);
    
    // Basic analysis
    const html = response.data;
    console.log(`📊 Page size: ${html.length} characters`);
    console.log(`📊 Status: ${response.status}`);
    
    // Look for common class patterns
    const classMatches = html.match(/class="[^"]*"/g) || [];
    const uniqueClasses = [...new Set(classMatches)].slice(0, 20);
    console.log('🎯 Found classes:');
    uniqueClasses.forEach(cls => console.log(`   ${cls}`));
    
    // Look for rules-related content
    const rulesPatterns = [
      /game-rules/gi,
      /rules-content/gi,
      /how to play/gi,
      /setup/gi,
      /game rules/gi
    ];
    
    console.log('\n🔍 Rules-related content:');
    rulesPatterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        console.log(`   Found "${pattern.source}": ${matches.length} matches`);
      }
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Error debugging page:`, error.message);
    return false;
  }
}

// Test with Catan
if (require.main === module) {
  debugUltraBGPage('catan')
    .then(() => console.log('🎉 Debug completed'))
    .catch(error => console.error('💥 Debug failed:', error));
}

module.exports = { debugUltraBGPage };

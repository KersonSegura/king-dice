const axios = require('axios');

async function fetchBGGLists() {
  try {
    // Fetch using the browser endpoint that doesn't require auth
    const url = 'https://boardgamegeek.com/geekhot.php?ajax=1&rowstart=0&rowend=50';
    
    console.log('🔍 Fetching real BGG hotness from browser endpoint...');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response type:', typeof response.data);
    console.log('Response length:', response.data?.length);

    // Try to parse HTML response
    const html = response.data;
    
    // Extract game names and links
    const games = [];
    const itemRegex = /<a[^>]*>([^<]+)<\/a>/g;
    const linkRegex = /href="\/boardgame\/(\d+)\/([^"]+)"/g;
    
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const bggId = match[1];
      const slug = match[2];
      games.push({ bggId: parseInt(bggId), slug });
    }

    console.log(`\n✅ Found ${games.length} BGG hotness games:\n`);
    games.forEach((game, index) => {
      console.log(`${index + 1}. BGG ID: ${game.bggId}, Slug: ${game.slug}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fetchBGGLists();



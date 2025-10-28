const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const prisma = new PrismaClient();

async function scrapeBGGLists() {
  try {
    console.log('🔍 Scraping BGG Hotness and Most Played lists...\n');

    // 1. Scrape BGG Hotness
    console.log('📊 Fetching BGG Hotness...');
    const hotnessResponse = await axios.get('https://boardgamegeek.com/hotness', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Save HTML for debugging
    fs.writeFileSync('scripts/bgg-hotness-page.html', hotnessResponse.data);
    console.log('📄 Saved HTML to bgg-hotness-page.html');
    
    const $hotness = cheerio.load(hotnessResponse.data);
    const hotness = [];
    
    // Try different selectors for BGG hotness table
    $hotness('table tr').each((index, element) => {
      if (index === 0) return; // Skip header
      
      const $row = $hotness(element);
      const rankCell = $row.find('td').eq(1); // Rank is usually in second column
      const gameCell = $row.find('td').eq(2); // Game is usually in third column
      
      const rank = rankCell.text().trim();
      const bggIdMatch = gameCell.find('a').attr('href')?.match(/boardgame\/(\d+)/) || 
                        rankCell.find('a').attr('href')?.match(/boardgame\/(\d+)/);
      
      if (bggIdMatch && rank) {
        const gameName = gameCell.find('a').text().trim() || rankCell.find('a').text().trim();
        hotness.push({
          bggId: parseInt(bggIdMatch[1]),
          rank: parseInt(rank) || index,
          name: gameName
        });
      }
    });

    console.log(`✅ Found ${hotness.length} hotness games`);
    if (hotness.length > 0) {
      hotness.slice(0, 5).forEach(g => console.log(`  ${g.rank}. ${g.name} (BGG: ${g.bggId})`));
      if (hotness.length > 5) console.log(`  ... and ${hotness.length - 5} more`);
    }
    console.log();

    // 2. Scrape BGG Most Played
    console.log('📊 Fetching BGG Most Played...');
    const mostPlayedResponse = await axios.get('https://boardgamegeek.com/trends/mostplayed', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $mostPlayed = cheerio.load(mostPlayedResponse.data);
    const mostPlayed = [];
    
    $mostPlayed('table.forum_table tr').each((index, element) => {
      if (index === 0) return; // Skip header
      
      const $row = $mostPlayed(element);
      const rank = $row.find('td').first().text().trim();
      const bggIdMatch = $row.find('a').attr('href')?.match(/boardgame\/(\d+)/);
      
      if (bggIdMatch && rank) {
        mostPlayed.push({
          bggId: parseInt(bggIdMatch[1]),
          rank: parseInt(rank)
        });
      }
    });

    console.log(`✅ Found ${mostPlayed.length} most played games\n`);

    // 3. Check which games we have
    console.log('🔍 Checking which games we have in database...\n');

    const hotnessIds = hotness.map(g => g.bggId);
    const mostPlayedIds = mostPlayed.map(g => g.bggId);

    const existingGames = await prisma.game.findMany({
      where: {
        bggId: {
          in: [...hotnessIds, ...mostPlayedIds]
        }
      },
      select: {
        bggId: true,
        nameEn: true,
        category: true
      }
    });

    const existingBggIds = new Set(existingGames.map(g => g.bggId));
    const categoryMap = {};
    existingGames.forEach(g => {
      categoryMap[g.bggId] = g.category;
    });

    // 4. Display missing games for Hotness
    console.log('🔥 HOTNESS ANALYSIS:');
    let missingHotness = 0;
    hotness.forEach((game, index) => {
      const hasIt = existingBggIds.has(game.bggId);
      const currentCategory = categoryMap[game.bggId] || 'none';
      
      if (!hasIt) {
        console.log(`❌ Missing (Rank ${game.rank}): BGG ID ${game.bggId}`);
        missingHotness++;
      } else if (currentCategory !== 'hotness') {
        console.log(`⚠️  Wrong category (Rank ${game.rank}): ${game.bggId} - currently "${currentCategory}"`);
      }
    });
    console.log(`\n📊 Hotness: Missing ${missingHotness} games`);

    // 5. Display missing games for Most Played
    console.log('\n🎮 MOST PLAYED ANALYSIS:');
    let missingMostPlayed = 0;
    mostPlayed.forEach((game, index) => {
      const hasIt = existingBggIds.has(game.bggId);
      const currentCategory = categoryMap[game.bggId] || 'none';
      
      if (!hasIt) {
        console.log(`❌ Missing (Rank ${game.rank}): BGG ID ${game.bggId}`);
        missingMostPlayed++;
      } else if (currentCategory !== 'most-played') {
        console.log(`⚠️  Wrong category (Rank ${game.rank}): ${game.bggId} - currently "${currentCategory}"`);
      }
    });
    console.log(`\n📊 Most Played: Missing ${missingMostPlayed} games`);

    console.log(`\n📊 SUMMARY:`);
    console.log(`🔥 Hotness: ${hotness.length} total, Missing ${missingHotness}`);
    console.log(`🎮 Most Played: ${mostPlayed.length} total, Missing ${missingMostPlayed}`);

    // Save to JSON for reference
    fs.writeFileSync('scripts/bgg-hotness-list.json', JSON.stringify(hotness, null, 2));
    fs.writeFileSync('scripts/bgg-most-played-list.json', JSON.stringify(mostPlayed, null, 2));
    console.log('\n✅ Saved lists to JSON files');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

scrapeBGGLists();


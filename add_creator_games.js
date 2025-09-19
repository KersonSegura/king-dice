const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

// Configuration
const DELAY_BETWEEN_REQUESTS = 2000; // 2 second delay between API calls

// Games to search for by name
const TARGET_GAMES = [
  // Unstable Games
  'Unstable Unicorns',
  'Unstable Unicorns: NSFW Deck',
  'Unstable Unicorns: Rainbow Apocalypse',
  'Unstable Unicorns: Dragons',
  'Unstable Unicorns: Adventures',
  
  // Exploding Kittens
  'Exploding Kittens',
  'Exploding Kittens: Imploding Kittens',
  'Exploding Kittens: Streaking Kittens',
  'Exploding Kittens: Barking Kittens',
  'Exploding Kittens: Meow Mix',
  'Exploding Kittens: Party Pack',
  'Exploding Kittens: Recipe for Disaster',
  'Exploding Kittens: Good vs Evil',
  'Exploding Kittens: Zombie Kittens',
  'Exploding Kittens: Russian Roulette',
  'Exploding Kittens: NSFW Deck',
  'Exploding Kittens: Original Art',
  'Exploding Kittens: Kickstarter Edition',
  'Exploding Kittens: Family Edition',
  'Exploding Kittens: 2-Player Edition',
  
  // Catan Studio - focus on newer/less common ones
  'Catan: Starfarers',
  'Catan: Rise of the Inkas',
  'Catan: Ancient Egypt',
  'Catan: Dawn of Humankind'
];

/**
 * Search for a game by name using BGG API
 */
async function searchGameByName(gameName) {
  try {
    console.log(`    🔍 Searching for: "${gameName}"`);
    
    const response = await axios.get(`https://boardgamegeek.com/xmlapi2/search`, {
      params: {
        query: gameName,
        type: 'boardgame',
        exact: 0
      },
      timeout: 15000
    });
    
    if (response.data && response.data.items && response.data.items.item) {
      const games = response.data.items.item;
      console.log(`      Found ${games.length} results`);
      
      // Find the best match
      const bestMatch = games.find(game => 
        game.name.value.toLowerCase().includes(gameName.toLowerCase()) ||
        gameName.toLowerCase().includes(game.name.value.toLowerCase())
      );
      
      if (bestMatch) {
        console.log(`      ✅ Best match: ${bestMatch.name.value} (BGG ID: ${bestMatch.id})`);
        return {
          bggId: parseInt(bestMatch.id),
          name: bestMatch.name.value,
          year: bestMatch.yearpublished ? parseInt(bestMatch.yearpublished.value) : null
        };
      }
    }
    
    console.log(`      ⚠️ No good match found for: "${gameName}"`);
    return null;
    
  } catch (error) {
    console.error(`      ❌ Error searching for "${gameName}":`, error.message);
    return null;
  }
}

/**
 * Get detailed game information from BGG API
 */
async function getGameDetails(bggId) {
  try {
    console.log(`      🔍 Getting details for BGG ID: ${bggId}`);
    
    const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing`, {
      params: {
        id: bggId,
        stats: 1
      },
      timeout: 15000
    });
    
    if (response.data && response.data.items && response.data.items.item) {
      const game = response.data.items.item[0];
      
      // Extract game information
      const name = game.name.find(n => n.type === 'primary')?.value || game.name[0]?.value || 'Unknown';
      const year = game.yearpublished?.value ? parseInt(game.yearpublished.value) : null;
      const minPlayers = game.minplayers?.value ? parseInt(game.minplayers.value) : null;
      const maxPlayers = game.maxplayers?.value ? parseInt(game.maxplayers.value) : null;
      const minPlayTime = game.minplaytime?.value ? parseInt(game.minplaytime.value) : null;
      const maxPlayTime = game.maxplaytime?.value ? parseInt(game.maxplaytime.value) : null;
      const image = game.image || null;
      const thumbnail = game.thumbnail || null;
      
      // Get publisher information
      const links = game.links || [];
      const publisher = links.find(link => link.type === 'boardgamepublisher')?.value || null;
      const designer = links.find(link => link.type === 'boardgamedesigner')?.value || null;
      
      // Get statistics
      const stats = game.statistics?.ratings || {};
      const averageRating = stats.average?.value ? parseFloat(stats.average.value) : null;
      const numVotes = stats.usersrated?.value ? parseInt(stats.usersrated.value) : null;
      const ranking = stats.ranks?.rank?.find(r => r.name === 'boardgame')?.value ? 
        parseInt(stats.ranks.rank.find(r => r.name === 'boardgame').value) : null;
      
      console.log(`        ✅ Successfully parsed: ${name}`);
      
      return {
        bggId: bggId,
        nameEn: name,
        nameEs: name, // Same as English for now
        yearRelease: year,
        minPlayers: minPlayers,
        maxPlayers: maxPlayers,
        durationMinutes: maxPlayTime || minPlayTime || 60,
        imageUrl: image,
        thumbnailUrl: thumbnail,
        developer: publisher,
        designer: designer,
        averageRating: averageRating,
        userVotes: numVotes || 0,
        category: 'ranked', // Default category
        // Legacy fields
        name: name,
        year: year,
        minPlayTime: minPlayTime,
        maxPlayTime: maxPlayTime,
        image: image
      };
    } else {
      console.log(`        ⚠️ No data returned for BGG ID: ${bggId}`);
      return null;
    }
    
  } catch (error) {
    console.error(`        ❌ Error getting details for BGG ID ${bggId}:`, error.message);
    return null;
  }
}

/**
 * Save games to database
 */
async function saveGamesToDatabase(games) {
  console.log(`💾 Saving ${games.length} games to database...`);
  
  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const game of games) {
    try {
      // Check if game already exists
      const existingGame = await prisma.game.findUnique({
        where: { bggId: game.bggId }
      });
      
      if (existingGame) {
        console.log(`    ⏭️ Skipping existing game: ${game.nameEn}`);
        skippedCount++;
        continue;
      }
      
      // Create new game
      await prisma.game.create({
        data: game
      });
      
      console.log(`    ✅ Created: ${game.nameEn} (${game.yearRelease || 'N/A'})`);
      savedCount++;
      
    } catch (error) {
      console.error(`    ❌ Error saving ${game.nameEn}:`, error.message);
      errorCount++;
    }
    
    // Small delay between saves
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`  📊 Results:`);
  console.log(`    ✅ Created: ${savedCount}`);
  console.log(`    ⏭️ Skipped (existing): ${skippedCount}`);
  console.log(`    ❌ Errors: ${errorCount}`);
  
  return { savedCount, skippedCount, errorCount };
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting to add games from Unstable Games, Exploding Kittens, and Catan Studio...');
    console.log(`🎯 Target: ${TARGET_GAMES.length} games to search for`);
    
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Search for each game and get details
    console.log(`\n🔍 Searching for games and getting details...`);
    const gamesWithDetails = [];
    
    for (let i = 0; i < TARGET_GAMES.length; i++) {
      const gameName = TARGET_GAMES[i];
      console.log(`\n  [${i + 1}/${TARGET_GAMES.length}] Processing: ${gameName}`);
      
      // Search for the game
      const searchResult = await searchGameByName(gameName);
      
      if (searchResult) {
        // Get detailed information
        const gameDetails = await getGameDetails(searchResult.bggId);
        
        if (gameDetails) {
          gamesWithDetails.push(gameDetails);
          console.log(`    ✅ Added to processing queue`);
        } else {
          console.log(`    ❌ Failed to get details, skipping`);
        }
      } else {
        console.log(`    ❌ Failed to find game, skipping`);
      }
      
      // Delay to avoid rate limiting
      if (i < TARGET_GAMES.length - 1) {
        console.log(`    ⏳ Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next request...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }
    
    // Save games to database
    if (gamesWithDetails.length > 0) {
      console.log(`\n💾 Processing ${gamesWithDetails.length} games with details...`);
      const { savedCount, skippedCount, errorCount } = await saveGamesToDatabase(gamesWithDetails);
      
      // Final statistics
      const totalGames = await prisma.game.count();
      console.log(`\n📊 Final Results:`);
      console.log(`  🎮 Total games in database: ${totalGames}`);
      console.log(`  ✅ New games added: ${savedCount}`);
      console.log(`  ⏭️ Games skipped (already existed): ${skippedCount}`);
      console.log(`  ❌ Errors: ${errorCount}`);
      
      if (savedCount > 0) {
        console.log('\n🎉 Successfully added new games!');
      } else {
        console.log('\n⚠️ No new games were added (they may already exist)');
      }
    } else {
      console.log('\n❌ No games with details to process');
    }
    
  } catch (error) {
    console.error('❌ Error in main process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };

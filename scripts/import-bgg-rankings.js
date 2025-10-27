const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// BoardGameGeek XML API2 endpoint for getting game details
const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2/thing';

async function fetchBGGData(bggId) {
  try {
    console.log(`🔍 Fetching BGG data for game ID: ${bggId}`);
    
    const response = await fetch(`${BGG_API_BASE}?id=${bggId}&stats=1`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // Parse XML to extract ranking and rating data
    // Look for boardgame ranking specifically - the correct pattern
    const rankingMatch = xmlText.match(/<rank type="subtype" id="1" name="boardgame"[^>]*value="(\d+)"/);
    const ratingMatch = xmlText.match(/<average.*?value="([0-9.]+)"/);
    const votesMatch = xmlText.match(/<usersrated.*?value="(\d+)"/);
    
    const ranking = rankingMatch ? parseInt(rankingMatch[1]) : null;
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
    const votes = votesMatch ? parseInt(votesMatch[1]) : null;
    
    console.log(`📊 BGG Data for ${bggId}: Ranking=${ranking}, Rating=${rating}, Votes=${votes}`);
    
    return {
      bggRanking: ranking,
      bggRating: rating,
      bggVotes: votes
    };
  } catch (error) {
    console.error(`❌ Error fetching BGG data for ${bggId}:`, error.message);
    return {
      bggRanking: null,
      bggRating: null,
      bggVotes: null
    };
  }
}

async function importBGGRankings() {
  try {
    console.log('🚀 Starting BGG rankings import...');
    
    // Get all games that have a bggId but no BGG ranking data
    const games = await prisma.game.findMany({
      where: {
        bggId: { not: null },
        OR: [
          { bggRanking: null },
          { bggRating: null },
          { bggVotes: null }
        ]
      },
      select: {
        id: true,
        bggId: true,
        name: true
      },
      take: 50 // Process in batches to avoid overwhelming BGG API
    });
    
    console.log(`📋 Found ${games.length} games to process`);
    
    if (games.length === 0) {
      console.log('✅ No games need BGG data import');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const game of games) {
      try {
        console.log(`\n🎮 Processing: ${game.name} (BGG ID: ${game.bggId})`);
        
        const bggData = await fetchBGGData(game.bggId);
        
        // Update the game with BGG data
        await prisma.game.update({
          where: { id: game.id },
          data: {
            bggRanking: bggData.bggRanking,
            bggRating: bggData.bggRating,
            bggVotes: bggData.bggVotes
          }
        });
        
        console.log(`✅ Updated ${game.name} with BGG data`);
        successCount++;
        
        // Add delay to be respectful to BGG API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing ${game.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Successfully processed: ${successCount} games`);
    console.log(`❌ Errors: ${errorCount} games`);
    
  } catch (error) {
    console.error('❌ Fatal error during BGG import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importBGGRankings();

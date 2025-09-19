const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function selectDailyGames() {
  try {
    console.log('=== Selecting Best Games for Daily Image Mode ===');
    
    // Get games with images
    const candidateGames = await prisma.game.findMany({
      where: {
        imageUrl: { not: null }
      },
      select: {
        id: true,
        nameEn: true,
        nameEs: true,
        imageUrl: true,
        thumbnailUrl: true,
        userRating: true,
        userVotes: true,
        yearRelease: true,
        minPlayers: true,
        maxPlayers: true,
        durationMinutes: true
      },
      orderBy: [
        { userRating: 'desc' },
        { userVotes: 'desc' }
      ]
    });

    console.log(`Found ${candidateGames.length} candidate games`);

    // Filter for games suitable for Image Mode
    const suitableGames = candidateGames.filter(game => {
      // Must have a clean, recognizable name
      if (!game.nameEn || game.nameEn.length > 30) return false;
      
      // Must have high-quality image URL
      if (!game.imageUrl || !game.imageUrl.includes('__original')) return false;
      
      // Exclude expansions and variants
      if (game.nameEn.toLowerCase().includes('expansion') || 
          game.nameEn.toLowerCase().includes('extension') ||
          game.nameEn.toLowerCase().includes('variant')) return false;
      
      return true;
    });

    console.log(`${suitableGames.length} games suitable for daily play`);

    // Shuffle and select first 400 games
    const shuffled = suitableGames.sort(() => 0.5 - Math.random());
    const selectedGames = shuffled.slice(0, 400);

    console.log('\n=== Daily Games Selection ===');
    console.log(`Total selected: ${selectedGames.length} games`);

    // Save selection to JSON file for daily game system
    const dailyGamesData = {
      generatedAt: new Date().toISOString(),
      totalGames: selectedGames.length,
      games: selectedGames.map((game, index) => ({
        id: game.id,
        dayIndex: index, // Day 0, 1, 2, etc.
        name: game.nameEn,
        imageUrl: game.imageUrl,
        rating: game.userRating,
        votes: game.userVotes,
        year: game.yearRelease,
        players: `${game.minPlayers}-${game.maxPlayers}`,
        duration: game.durationMinutes
      }))
    };

    await fs.writeFile('daily-games-selection.json', JSON.stringify(dailyGamesData, null, 2));
    console.log('\n✅ Daily games selection saved to daily-games-selection.json');

    // Show some sample games
    console.log('\n=== Sample Daily Games ===');
    selectedGames.slice(0, 10).forEach((game, index) => {
      console.log(`Day ${index + 1}: ${game.nameEn} (Year: ${game.yearRelease || 'Unknown'})`);
    });

    // Quality analysis
    const gamesWithYear = selectedGames.filter(g => g.yearRelease);
    const years = gamesWithYear.map(g => g.yearRelease);
    
    console.log('\n=== Quality Metrics ===');
    console.log(`Games selected: ${selectedGames.length}`);
    console.log(`Games with year data: ${gamesWithYear.length}`);
    if (years.length > 0) {
      console.log(`Years covered: ${Math.min(...years)} - ${Math.max(...years)}`);
    }

  } catch (error) {
    console.error('Error selecting daily games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Add fs import
const fs = require('fs').promises;

selectDailyGames();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Top Ranked Games (Most Played) list from BGG
const topRankedGames = [
  { name: 'Flip 7', year: 2024 },
  { name: 'Ark Nova', year: 2021 },
  { name: 'Harmonies', year: 2024 },
  { name: 'Castle Combo', year: 2024 },
  { name: 'Bomb Busters', year: 2024 },
  { name: 'Forest Shuffle', year: 2023 },
  { name: 'Sea Salt & Paper', year: 2022 },
  { name: 'Terraforming Mars', year: 2016 },
  { name: 'Azul', year: 2017 },
  { name: 'Wingspan', year: 2019 },
  { name: 'The Lord of the Rings: Fate of the Fellowship', year: 2025 },
  { name: 'Faraway', year: 2023 },
  { name: 'Sky Team', year: 2023 },
  { name: 'Cascadia', year: 2021 },
  { name: 'Lost Ruins of Arnak', year: 2020 },
  { name: 'Heat: Pedal to the Metal', year: 2022 },
  { name: 'Vantage', year: 2025 },
  { name: 'SETI: Search for Extraterrestrial Intelligence', year: 2024 },
  { name: 'The White Castle', year: 2023 },
  { name: 'SCOUT', year: 2019 },
  { name: '7 Wonders Duel', year: 2015 },
  { name: 'Carcassonne', year: 2000 },
  { name: 'The Gang', year: 2024 },
  { name: 'The Lord of the Rings: The Fellowship of the Ring – Trick-Taking Game', year: 2024 },
  { name: 'Splendor', year: 2014 }
];

async function updateTopRanked() {
  try {
    console.log('🏆 Updating Top Ranked (Most Played) games...\n');
    
    // First, clear all most-played ranks
    await prisma.game.updateMany({
      where: { category: 'most-played' },
      data: { category: 'ranked', hotnessRank: null }
    });
    
    let updatedCount = 0;
    const notFound = [];
    
    for (let i = 0; i < topRankedGames.length; i++) {
      const gameInfo = topRankedGames[i];
      
      // Find game by name
      const game = await prisma.game.findFirst({
        where: {
          OR: [
            { nameEn: { equals: gameInfo.name, mode: 'insensitive' } },
            { name: { equals: gameInfo.name, mode: 'insensitive' } }
          ]
        }
      });
      
      if (game) {
        // Update to most-played category
        await prisma.game.update({
          where: { id: game.id },
          data: { 
            category: 'most-played',
            hotnessRank: i + 1  // Using hotnessRank field for order
          }
        });
        
        console.log(`${i + 1}. ✅ ${gameInfo.name} (ID: ${game.id})`);
        updatedCount++;
      } else {
        console.log(`${i + 1}. ❌ NOT FOUND: ${gameInfo.name}`);
        notFound.push(i);
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} games to most-played category`);
    
    // Add missing games
    if (notFound.length > 0) {
      console.log(`\n📝 Adding missing games...`);
      for (const index of notFound) {
        const gameInfo = topRankedGames[index];
        const newGame = await prisma.game.create({
          data: {
            nameEn: gameInfo.name,
            nameEs: gameInfo.name,
            name: gameInfo.name,
            yearRelease: gameInfo.year,
            year: gameInfo.year,
            category: 'most-played',
            hotnessRank: index + 1
          }
        });
        
        console.log(`${index + 1}. ✅ Created: ${gameInfo.name} (ID: ${newGame.id})`);
      }
    }
    
    // Verify final count
    const finalCount = await prisma.game.count({
      where: { category: 'most-played' }
    });
    
    console.log(`\n✅ Total most-played games: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTopRanked();


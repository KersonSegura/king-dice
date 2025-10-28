const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Missing games from the hotness list
const missingGames = [
  { nameEn: 'Deckers', yearRelease: 2025 },
  { nameEn: 'Tax the Rich', yearRelease: 2025 },
  { nameEn: 'Children of the Colossi', yearRelease: 2025 },
  { nameEn: 'Kuldhara', yearRelease: 2025 },
  { nameEn: 'The Hobbit: There and Back Again', yearRelease: 2025 },
  { nameEn: 'SETI: Space Agencies', yearRelease: 2025 },
  { nameEn: 'The Lord of the Rings: Duel for Middle-Earth – Allies', yearRelease: 2025 },
  { nameEn: 'SETI: Search for Extraterrestrial Intelligence', yearRelease: 2024 },
  { nameEn: 'Bohemians', yearRelease: 2025 },
  { nameEn: 'Gelati', yearRelease: 2025 },
  { nameEn: 'Galileo\'s Truth', yearRelease: 2026 },
  { nameEn: '1ers Contacts', yearRelease: 2025 },
  { nameEn: 'Wispwood', yearRelease: 2025 },
  { nameEn: 'Emberheart', yearRelease: 2025 },
  { nameEn: 'Lost Ruins of Arnak: Twisted Paths', yearRelease: 2025 },
  { nameEn: 'Coming of Age', yearRelease: 2025 },
  { nameEn: 'Federation: Piracy', yearRelease: 2025 },
  { nameEn: 'Kingdom Crossing', yearRelease: 2025 }
];

async function addMissingGames() {
  try {
    console.log('📝 Adding missing games to database...\n');
    
    let addedCount = 0;
    
    for (const game of missingGames) {
      // Create the game entry with just the name and year
      const newGame = await prisma.game.create({
        data: {
          nameEn: game.nameEn,
          nameEs: game.nameEn, // Copy English name to Spanish
          name: game.nameEn,
          yearRelease: game.yearRelease,
          year: game.yearRelease,
          category: 'hotness'
        }
      });
      
      console.log(`✅ Added: ${game.nameEn} (ID: ${newGame.id})`);
      addedCount++;
    }
    
    console.log(`\n📊 Summary: Added ${addedCount} new games to hotness category`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingGames();


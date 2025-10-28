const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The EXACT order from BGG hotness list with full names
const hotnessOrder = [
  { name: 'Covenant', year: 2025 },
  { name: 'Recall', year: 2025 },
  { name: 'Deckers', year: 2025 },
  { name: 'Tax the Rich', year: 2025 },
  { name: 'Children of the Colossi', year: 2025 },
  { name: 'Kuldhara', year: 2025 },
  { name: 'Orloj: The Prague Astronomical Clock', year: 2025 },
  { name: 'The Hobbit: There and Back Again', year: 2025 },
  { name: 'SETI: Space Agencies', year: 2025 },
  { name: 'Feya\'s Swamp', year: 2025 },
  { name: 'The Lord of the Rings: Duel for Middle-Earth – Allies', year: 2025 },
  { name: 'SETI: Search for Extraterrestrial Intelligence', year: 2024 },
  { name: 'Speakeasy', year: 2025 },
  { name: 'The Old King\'s Crown', year: 2025 },
  { name: 'The Lord of the Rings: Fate of the Fellowship', year: 2025 },
  { name: 'Sanctuary', year: 2025 },
  { name: 'Bohemians', year: 2025 },
  { name: 'Tag Team', year: 2025 },
  { name: 'Vantage', year: 2025 },
  { name: 'Gelati', year: 2025 },
  { name: 'The Druids of Edora', year: 2025 },
  { name: 'Take Time', year: 2025 },
  { name: 'Ayar: Children of the Sun', year: 2025 },
  { name: 'Ark Nova', year: 2021 },
  { name: 'Galileo\'s Truth', year: 2026 },
  { name: 'The Lord of the Rings: Duel for Middle-earth', year: 2024 },
  { name: '1ers Contacts', year: 2025 },
  { name: 'Wispwood', year: 2025 },
  { name: 'Emberheart', year: 2025 },
  { name: 'Lost Ruins of Arnak: Twisted Paths', year: 2025 },
  { name: 'ANTS', year: 2025 },
  { name: 'Lost Ruins of Arnak', year: 2020 },
  { name: 'Brass: Birmingham', year: 2018 },
  { name: 'Coming of Age', year: 2025 },
  { name: 'Galactic Cruise', year: 2025 },
  { name: 'Forestry', year: 2025 },
  { name: 'Federation: Piracy', year: 2025 },
  { name: 'Nature', year: 2025 },
  { name: 'Echoes of Time', year: 2025 },
  { name: 'Arcs', year: 2024 },
  { name: 'The Elder Scrolls: Betrayal of the Second Era', year: 2025 },
  { name: 'Bomb Busters', year: 2024 },
  { name: 'Terraforming Mars', year: 2016 },
  { name: 'Kingdom Crossing', year: 2025 },
  { name: 'Castle Combo', year: 2024 },
  { name: 'Luthier', year: 2025 },
  { name: 'Slay the Spire: The Board Game', year: 2024 },
  { name: 'Origin Story', year: 2025 },
  { name: 'Harmonies', year: 2024 },
  { name: 'Tainted Grail: The Fall of Avalon', year: 2019 }
];

async function fixHotnessFinal() {
  try {
    console.log('🔧 Fixing hotness list with correct games...\n');
    
    // First, clear all hotness ranks
    await prisma.game.updateMany({
      where: { category: 'hotness' },
      data: { category: 'ranked', hotnessRank: null }
    });
    
    let updatedCount = 0;
    const notFound = [];
    
    for (let i = 0; i < hotnessOrder.length; i++) {
      const gameInfo = hotnessOrder[i];
      
      // Special handling for "Covenant" - it should match "Covenant" not "The Ark of the Covenant"
      let game;
      if (gameInfo.name === 'Covenant') {
        game = await prisma.game.findFirst({
          where: {
            nameEn: { equals: 'Covenant', mode: 'insensitive' }
          }
        });
      } else {
        // Find exact match
        game = await prisma.game.findFirst({
          where: {
            OR: [
              { nameEn: { equals: gameInfo.name, mode: 'insensitive' } },
              { name: { equals: gameInfo.name, mode: 'insensitive' } }
            ]
          }
        });
      }
      
      if (game) {
        // Update hotnessRank
        await prisma.game.update({
          where: { id: game.id },
          data: { 
            category: 'hotness',
            hotnessRank: i + 1
          }
        });
        
        console.log(`${i + 1}. ✅ ${gameInfo.name} (ID: ${game.id})`);
        updatedCount++;
      } else {
        console.log(`${i + 1}. ❌ NOT FOUND: ${gameInfo.name}`);
        notFound.push(i);
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} games with hotness ranks`);
    
    if (notFound.length > 0) {
      console.log(`\n📝 Adding missing games...`);
      for (const index of notFound) {
        const gameInfo = hotnessOrder[index];
        const newGame = await prisma.game.create({
          data: {
            nameEn: gameInfo.name,
            nameEs: gameInfo.name,
            name: gameInfo.name,
            yearRelease: gameInfo.year,
            year: gameInfo.year,
            category: 'hotness',
            hotnessRank: index + 1
          }
        });
        
        console.log(`${index + 1}. ✅ Created: ${gameInfo.name} (ID: ${newGame.id})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHotnessFinal();


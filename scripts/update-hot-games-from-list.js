const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The top 50 hottest games from BGG (as of now)
const hotnessGames = [
  'Covenant',
  'Recall',
  'Deckers',
  'Tax the Rich',
  'Children of the Colossi',
  'Kuldhara',
  'Orloj: The Prague Astronomical Clock',
  'The Hobbit: There and Back Again',
  'SETI: Space Agencies',
  'Feya\'s Swamp',
  'The Lord of the Rings: Duel for Middle-Earth – Allies',
  'SETI: Search for Extraterrestrial Intelligence',
  'Speakeasy',
  'The Old King\'s Crown',
  'The Lord of the Rings: Fate of the Fellowship',
  'Sanctuary',
  'Bohemians',
  'Tag Team',
  'Vantage',
  'Gelati',
  'The Druids of Edora',
  'Take Time',
  'Ayar: Children of the Sun',
  'Ark Nova',
  'Galileo\'s Truth',
  'The Lord of the Rings: Duel for Middle-earth',
  '1ers Contacts',
  'Wispwood',
  'Emberheart',
  'Lost Ruins of Arnak: Twisted Paths',
  'ANTS',
  'Lost Ruins of Arnak',
  'Brass: Birmingham',
  'Coming of Age',
  'Galactic Cruise',
  'Forestry',
  'Federation: Piracy',
  'Nature',
  'Echoes of Time',
  'Arcs',
  'The Elder Scrolls: Betrayal of the Second Era',
  'Bomb Busters',
  'Terraforming Mars',
  'Kingdom Crossing',
  'Castle Combo',
  'Luthier',
  'Slay the Spire: The Board Game',
  'Origin Story',
  'Harmonies',
  'Tainted Grail: The Fall of Avalon'
];

async function updateHotnessGames() {
  try {
    console.log('🔥 Updating BGG Hotness games in database...\n');
    
    // Step 1: First, remove all games from the hotness category
    await prisma.game.updateMany({
      where: { category: 'hotness' },
      data: { category: 'ranked' }
    });
    console.log('✅ Cleared existing hotness category');
    
    let foundCount = 0;
    let notFoundCount = 0;
    const notFoundGames = [];
    
    // Step 2: Find and update games from the list
    for (let i = 0; i < hotnessGames.length; i++) {
      const gameName = hotnessGames[i];
      
      // Try to find the game by name
      const game = await prisma.game.findFirst({
        where: {
          OR: [
            { nameEn: { contains: gameName, mode: 'insensitive' } },
            { nameEs: { contains: gameName, mode: 'insensitive' } },
            { name: { contains: gameName, mode: 'insensitive' } }
          ]
        }
      });
      
      if (game) {
        await prisma.game.update({
          where: { id: game.id },
          data: { category: 'hotness' }
        });
        console.log(`✅ ${i + 1}. ${gameName} → Found and updated (ID: ${game.id})`);
        foundCount++;
      } else {
        console.log(`❌ ${i + 1}. ${gameName} → Not found in database`);
        notFoundGames.push(gameName);
        notFoundCount++;
      }
    }
    
    // Step 3: Summary
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully updated ${foundCount} games to hotness category`);
    console.log(`❌ ${notFoundCount} games not found in database`);
    
    if (notFoundGames.length > 0) {
      console.log(`\n📋 Missing games:`);
      notFoundGames.forEach((name, index) => {
        console.log(`   ${index + 1}. ${name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateHotnessGames();



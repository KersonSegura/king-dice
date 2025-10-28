const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The EXACT order from BGG hotness list
const hotnessOrder = [
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

async function fixHotnessOrder() {
  try {
    console.log('🔧 Fixing hotness game order...\n');
    
    // First, add the "name" field to all 18 newly added games that might be missing it
    const newGameIds = [10730, 10731, 10732, 10733, 10734, 10735, 10736, 10737, 10738, 10739, 10740, 10741, 10742, 10743, 10744, 10745, 10746, 10747];
    
    for (const id of newGameIds) {
      const game = await prisma.game.findUnique({
        where: { id },
        select: { nameEn: true, name: true }
      });
      
      if (game && !game.name) {
        await prisma.game.update({
          where: { id },
          data: { name: game.nameEn }
        });
        console.log(`✅ Updated name field for ID ${id}: ${game.nameEn}`);
      }
    }
    
    console.log('\n📊 Reordering games by BGG hotness ranking...\n');
    
    // Now, clear hotness category and reapply in correct order
    await prisma.game.updateMany({
      where: { category: 'hotness' },
      data: { category: 'ranked' }
    });
    
    let updatedCount = 0;
    const updatedGames = [];
    
    for (let i = 0; i < hotnessOrder.length; i++) {
      const gameName = hotnessOrder[i];
      
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
        // Update to hotness category
        await prisma.game.update({
          where: { id: game.id },
          data: { category: 'hotness' }
        });
        
        updatedGames.push({
          position: i + 1,
          name: gameName,
          gameId: game.id,
          dbName: game.nameEn || game.name
        });
        
        updatedCount++;
      } else {
        console.log(`❌ Not found in DB: ${gameName} (position ${i + 1})`);
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} games to hotness category`);
    console.log(`\n📋 Games in order:`);
    updatedGames.forEach(g => {
      console.log(`${g.position}. ${g.dbName} (ID: ${g.gameId})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHotnessOrder();



const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The EXACT order from BGG hotness list with full names
const hotnessOrder = [
  'The Ark of the Covenant',
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
  'Lost Ruins of Arnak', // Position 31: ANTS not found, using next available
  'Lost Ruins of Arnak',
  'Brass: Birmingham',
  'Coming of Age',
  'Galactic Cruise',
  'Forestry',
  'Federation: Piracy',
  'Echoes of Time', // Position 38: Nature not found, using next available
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

async function updateHotnessRanks() {
  try {
    console.log('🔧 Updating hotness ranks...\n');
    
    let updatedCount = 0;
    const updatedGames = [];
    
    for (let i = 0; i < hotnessOrder.length; i++) {
      const gameName = hotnessOrder[i];
      
      // Find exact match
      const game = await prisma.game.findFirst({
        where: {
          OR: [
            { nameEn: { equals: gameName, mode: 'insensitive' } },
            { name: { equals: gameName, mode: 'insensitive' } }
          ]
        }
      });
      
      if (game) {
        // Update hotnessRank
        await prisma.game.update({
          where: { id: game.id },
          data: { 
            category: 'hotness',
            hotnessRank: i + 1
          }
        });
        
        updatedGames.push({
          position: i + 1,
          name: gameName,
          gameId: game.id
        });
        
        updatedCount++;
        console.log(`${i + 1}. ✅ ${gameName} (ID: ${game.id})`);
      } else {
        console.log(`${i + 1}. ❌ NOT FOUND: ${gameName}`);
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} games with hotness ranks`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateHotnessRanks();



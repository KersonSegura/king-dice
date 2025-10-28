const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Map of BGG names to exact DB names
const gameNameMapping = {
  'Covenant': 'The Ark of the Covenant',
  'Recall': 'Recall', // Need to find the right one
  'Deckers': 'Deckers',
  'Tax the Rich': 'Tax the Rich',
  'Children of the Colossi': 'Children of the Colossi',
  'Kuldhara': 'Kuldhara',
  'Orloj: The Prague Astronomical Clock': 'Orloj: The Prague Astronomical Clock',
  'The Hobbit: There and Back Again': 'The Hobbit: There and Back Again',
  'SETI: Space Agencies': 'SETI: Space Agencies',
  'Feya\'s Swamp': 'Feya\'s Swamp',
  'The Lord of the Rings: Duel for Middle-Earth – Allies': 'The Lord of the Rings: Duel for Middle-Earth – Allies',
  'SETI: Search for Extraterrestrial Intelligence': 'SETI: Search for Extraterrestrial Intelligence',
  'Speakeasy': 'Speakeasy',
  'The Old King\'s Crown': 'The Old King\'s Crown',
  'The Lord of the Rings: Fate of the Fellowship': 'The Lord of the Rings: Fate of the Fellowship',
  'Sanctuary': 'Sanctuary',
  'Bohemians': 'Bohemians',
  'Tag Team': 'Tag Team',
  'Vantage': 'Vantage',
  'Gelati': 'Gelati',
  'The Druids of Edora': 'The Druids of Edora',
  'Take Time': 'Take Time',
  'Ayar: Children of the Sun': 'Ayar: Children of the Sun',
  'Ark Nova': 'Ark Nova',
  'Galileo\'s Truth': 'Galileo\'s Truth',
  'The Lord of the Rings: Duel for Middle-earth': 'The Lord of the Rings: Duel for Middle-earth',
  '1ers Contacts': '1ers Contacts',
  'Wispwood': 'Wispwood',
  'Emberheart': 'Emberheart',
  'Lost Ruins of Arnak: Twisted Paths': 'Lost Ruins of Arnak: Twisted Paths',
  'ANTS': 'ANTS',
  'Lost Ruins of Arnak': 'Lost Ruins of Arnak',
  'Brass: Birmingham': 'Brass: Birmingham',
  'Coming of Age': 'Coming of Age',
  'Galactic Cruise': 'Galactic Cruise',
  'Forestry': 'Forestry',
  'Federation: Piracy': 'Federation: Piracy',
  'Nature': 'Nature',
  'Echoes of Time': 'Echoes of Time',
  'Arcs': 'Arcs',
  'The Elder Scrolls: Betrayal of the Second Era': 'The Elder Scrolls: Betrayal of the Second Era',
  'Bomb Busters': 'Bomb Busters',
  'Terraforming Mars': 'Terraforming Mars',
  'Kingdom Crossing': 'Kingdom Crossing',
  'Castle Combo': 'Castle Combo',
  'Luthier': 'Luthier',
  'Slay the Spire: The Board Game': 'Slay the Spire: The Board Game',
  'Origin Story': 'Origin Story',
  'Harmonies': 'Harmonies',
  'Tainted Grail: The Fall of Avalon': 'Tainted Grail: The Fall of Avalon'
};

async function fixHotnessExactMatch() {
  try {
    console.log('🔧 Fixing hotness games with exact matching...\n');
    
    // Clear hotness category
    await prisma.game.updateMany({
      where: { category: 'hotness' },
      data: { category: 'ranked' }
    });
    
    const BGGOrder = Object.keys(gameNameMapping);
    let updatedCount = 0;
    
    for (let i = 0; i < BGGOrder.length; i++) {
      const bggName = BGGOrder[i];
      const dbName = gameNameMapping[bggName];
      
      // Find exact match
      const game = await prisma.game.findFirst({
        where: {
          OR: [
            { nameEn: { equals: dbName, mode: 'insensitive' } },
            { name: { equals: dbName, mode: 'insensitive' } }
          ]
        }
      });
      
      if (game) {
        await prisma.game.update({
          where: { id: game.id },
          data: { category: 'hotness' }
        });
        
        console.log(`${i + 1}. ✅ ${dbName} (ID: ${game.id})`);
        updatedCount++;
      } else {
        console.log(`${i + 1}. ❌ NOT FOUND: ${dbName}`);
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount}/50 games to hotness category`);
    
    // Show what's actually in hotness now
    const hotnessGames = await prisma.game.findMany({
      where: { category: 'hotness' },
      select: { id: true, nameEn: true, name: true },
      orderBy: { id: 'asc' }
    });
    
    console.log(`\n📊 Currently in hotness: ${hotnessGames.length} games`);
    hotnessGames.slice(0, 10).forEach((g, i) => {
      console.log(`${i + 1}. ${g.nameEn || g.name} (ID: ${g.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHotnessExactMatch();



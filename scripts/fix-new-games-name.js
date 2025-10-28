const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixNameFields() {
  try {
    const ids = [10730, 10731, 10732, 10733, 10734, 10735, 10736, 10737, 10738, 10739, 10740, 10741, 10742, 10743, 10744, 10745, 10746, 10747];
    
    console.log('🔍 Checking new games...\n');
    
    for (const id of ids) {
      const game = await prisma.game.findUnique({
        where: { id },
        select: { id: true, nameEn: true, name: true }
      });
      
      if (game && game.nameEn) {
        // Update name field if it's null or different
        if (!game.name || game.name !== game.nameEn) {
          await prisma.game.update({
            where: { id },
            data: { name: game.nameEn }
          });
          console.log(`✅ Updated ID ${id}: ${game.nameEn}`);
        } else {
          console.log(`✓ Already correct: ID ${id}: ${game.nameEn}`);
        }
      } else {
        console.log(`❌ No game found for ID ${id}`);
      }
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNameFields();



const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findMissing() {
  try {
    console.log('🔍 Searching for ANTS and Nature...\n');
    
    const ants = await prisma.game.findMany({
      where: {
        OR: [
          { nameEn: { contains: 'ANTS', mode: 'insensitive' } },
          { nameEn: { contains: 'ANT', mode: 'insensitive' } }
        ]
      },
      select: { id: true, nameEn: true, name: true }
    });
    
    const nature = await prisma.game.findMany({
      where: {
        OR: [
          { nameEn: { contains: 'Nature', mode: 'insensitive' } }
        ]
      },
      select: { id: true, nameEn: true, name: true }
    });
    
    console.log('\n📋 Games matching ANTS:');
    ants.forEach(g => console.log(`  ID ${g.id}: ${g.nameEn || g.name}`));
    
    console.log('\n📋 Games matching Nature:');
    nature.forEach(g => console.log(`  ID ${g.id}: ${g.nameEn || g.name}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMissing();



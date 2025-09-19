const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugNullFields() {
  try {
    console.log('🔍 Checking for NULL description fields...\n');
    
    // Check all descriptions
    const allDescriptions = await prisma.gameDescription.findMany({
      take: 10,
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`📊 Found ${allDescriptions.length} description entries\n`);
    
    allDescriptions.forEach((desc, index) => {
      console.log(`Description ${index + 1}:`);
      console.log(`  ID: ${desc.id}`);
      console.log(`  Game ID: ${desc.gameId}`);
      console.log(`  Language: ${desc.language}`);
      console.log(`  Short Description: ${desc.shortDescription ? `"${desc.shortDescription.substring(0, 50)}..."` : 'NULL'}`);
      console.log(`  Full Description: ${desc.fullDescription ? `"${desc.fullDescription.substring(0, 50)}..."` : 'NULL'}`);
      console.log('');
    });
    
    // Count NULL fields
    const nullShortCount = await prisma.gameDescription.count({
      where: {
        shortDescription: null
      }
    });
    
    const nullFullCount = await prisma.gameDescription.count({
      where: {
        fullDescription: null
      }
    });
    
    console.log('📊 NULL Field Counts:');
    console.log(`  Short Description NULL: ${nullShortCount}`);
    console.log(`  Full Description NULL: ${nullFullCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugNullFields();

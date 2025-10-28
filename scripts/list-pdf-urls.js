const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listPdfUrls() {
  try {
    console.log('🔍 Finding all games with PDF URLs...\n');
    
    const games = await prisma.game.findMany({
      where: {
        pdfUrl: {
          not: null
        }
      },
      select: {
        id: true,
        nameEn: true,
        pdfUrl: true
      },
      orderBy: {
        nameEn: 'asc'
      }
    });

    console.log(`📋 Found ${games.length} games with PDF URLs:\n`);

    games.forEach(game => {
      console.log(`${game.id} | ${game.nameEn.substring(0, 40).padEnd(40)} | ${game.pdfUrl.substring(0, 120)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listPdfUrls();


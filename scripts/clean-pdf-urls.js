const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanPdfUrls() {
  try {
    console.log('🔍 Finding games with chrome-extension:// in PDF URLs...');
    
    // Find all games with PDF URLs containing chrome-extension://
    const games = await prisma.game.findMany({
      where: {
        pdfUrl: {
          contains: 'chrome-extension://'
        }
      },
      select: {
        id: true,
        nameEn: true,
        pdfUrl: true
      }
    });

    console.log(`📋 Found ${games.length} games with chrome-extension:// in PDF URLs\n`);

    if (games.length === 0) {
      console.log('✅ No games need cleaning');
      return;
    }

    let removedCount = 0;

    for (const game of games) {
      console.log(`🗑️  Removing PDF URL from: ${game.nameEn} (ID: ${game.id})`);
      
      try {
        // Remove the PDF URL completely
        await prisma.game.update({
          where: { id: game.id },
          data: {
            pdfUrl: null
          }
        });

        console.log(`   ✅ Removed PDF URL`);
        removedCount++;
        
      } catch (error) {
        console.error(`   ❌ Error removing PDF URL from game ${game.id}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully removed ${removedCount} PDF URLs`);
    console.log(`❌ Errors: ${games.length - removedCount} games`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanPdfUrls();


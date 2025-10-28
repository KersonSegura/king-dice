const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeExpiredPdfUrls() {
  try {
    console.log('🔍 Finding all games with PDF URLs...');
    
    // Find all games with PDF URLs
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
      }
    });

    console.log(`📋 Found ${games.length} games with PDF URLs\n`);

    if (games.length === 0) {
      console.log('✅ No games with PDF URLs');
      return;
    }

    let removedCount = 0;
    let keptCount = 0;

    for (const game of games) {
      try {
        // Check if it's an S3 signed URL that will expire
        const isS3SignedUrl = game.pdfUrl.includes('s3.amazonaws.com') && 
                              game.pdfUrl.includes('X-Amz-Signature');
        
        if (isS3SignedUrl) {
          // Remove the PDF URL
          await prisma.game.update({
            where: { id: game.id },
            data: {
              pdfUrl: null
            }
          });

          console.log(`🗑️  Removed expired URL from: ${game.nameEn} (ID: ${game.id})`);
          removedCount++;
        } else {
          // Keep the URL (it's not an S3 signed URL)
          console.log(`✓ Keeping: ${game.nameEn} - ${game.pdfUrl.substring(0, 60)}...`);
          keptCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing game ${game.id}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully removed ${removedCount} expired PDF URLs`);
    console.log(`✓ Kept ${keptCount} non-expiring PDF URLs`);
    console.log(`❌ Errors: ${games.length - removedCount - keptCount} games`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeExpiredPdfUrls();


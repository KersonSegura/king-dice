const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findS3Urls() {
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

    const s3Games = games.filter(game => 
      game.pdfUrl.includes('s3.amazonaws.com') || 
      game.pdfUrl.includes('X-Amz-Signature') ||
      game.pdfUrl.includes('X-Amz-Expires')
    );

    console.log(`📋 Found ${games.length} total games with PDF URLs`);
    console.log(`⚠️  Found ${s3Games.length} games with S3 signed URLs (expire after 120 seconds):\n`);

    s3Games.forEach(game => {
      console.log(`${game.id} | ${game.nameEn}`);
      console.log(`   ${game.pdfUrl.substring(0, 120)}...\n`);
    });

    if (s3Games.length === 0) {
      console.log('✅ No S3 signed URLs found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findS3Urls();


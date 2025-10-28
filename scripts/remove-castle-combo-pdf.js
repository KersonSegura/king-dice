const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeCastleComboPdf() {
  try {
    await prisma.game.update({
      where: { id: 10715 },
      data: {
        pdfUrl: null
      }
    });
    
    console.log('✅ Removed PDF URL from Castle Combo (ID: 10715)');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeCastleComboPdf();


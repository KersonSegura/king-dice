const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupSampleData() {
  try {
    // Delete sample posts created by our script
    const deletedPosts = await prisma.post.deleteMany({
      where: {
        title: {
          in: [
            'Best Strategy Games for 2024',
            'New Game Night Ideas', 
            'Catan Tournament Results',
            'Pandemic Legacy Season 1 Complete!'
          ]
        }
      }
    });
    console.log('🗑️ Deleted sample posts:', deletedPosts.count);

    // Delete sample gallery images created by our script
    const deletedImages = await prisma.galleryImage.deleteMany({
      where: {
        title: {
          in: [
            'Amazing Catan Setup',
            'Pandemic Legacy Board',
            'Wingspan Beautiful Setup',
            'Game Collection Display',
            'Ark Nova First Play',
            'Game Night Setup'
          ]
        }
      }
    });
    console.log('🗑️ Deleted sample images:', deletedImages.count);

    console.log('✅ Cleanup completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSampleData();

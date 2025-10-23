const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testQueries() {
  try {
    const posts = await prisma.post.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
    console.log('📝 Posts found:', posts.length);
    posts.forEach(p => console.log('  -', p.title));

    const images = await prisma.galleryImage.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
    console.log('🖼️ Images found:', images.length);
    images.forEach(i => console.log('  -', i.title, 'URL:', i.imageUrl));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQueries();

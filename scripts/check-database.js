const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAll() {
  try {
    const posts = await prisma.post.findMany();
    const images = await prisma.galleryImage.findMany();
    const users = await prisma.user.findMany();
    
    console.log('📝 Total posts:', posts.length);
    console.log('🖼️ Total images:', images.length);
    console.log('👥 Total users:', users.length);
    
    if (posts.length > 0) {
      console.log('Posts:');
      posts.forEach(p => console.log('  -', p.title, 'by', p.authorId));
    }
    
    if (images.length > 0) {
      console.log('Images:');
      images.forEach(i => console.log('  -', i.title, 'by', i.authorId));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAll();
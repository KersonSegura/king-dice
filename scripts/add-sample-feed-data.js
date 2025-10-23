const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleData() {
  try {
    console.log('🔍 Checking for existing users...');
    
    // Check if we have any users
    const users = await prisma.user.findMany({
      take: 1
    });
    
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }
    
    const sampleUser = users[0];
    console.log(`✅ Using user: ${sampleUser.username}`);
    
    // Add sample forum posts
    console.log('📝 Adding sample forum posts...');
    
    const samplePosts = [
      {
        title: 'Best Strategy Games for 2024',
        content: 'Here are my top picks for strategy games this year. Wingspan continues to be amazing, and I just discovered Ark Nova!',
        category: 'strategy',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 15, downvotes: 2 }),
        replies: 8
      },
      {
        title: 'New Game Night Ideas',
        content: 'Looking for suggestions for our weekly game night. We usually play 2-4 player games. Any recommendations?',
        category: 'general',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 12, downvotes: 1 }),
        replies: 15
      },
      {
        title: 'Catan Tournament Results',
        content: 'Just finished our monthly Catan tournament! The final game was intense. Here are the results...',
        category: 'strategy',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 23, downvotes: 3 }),
        replies: 12
      },
      {
        title: 'Pandemic Legacy Season 1 Complete!',
        content: 'We finally finished Pandemic Legacy Season 1 after 6 months! What an incredible experience. No spoilers!',
        category: 'reviews',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 18, downvotes: 0 }),
        replies: 6
      }
    ];
    
    for (const postData of samplePosts) {
      await prisma.post.create({
        data: postData
      });
    }
    
    console.log('✅ Added 4 sample forum posts');
    
    // Add sample gallery images
    console.log('🖼️ Adding sample gallery images...');
    
    // First, get existing gallery images to use real images
    const existingImages = await prisma.galleryImage.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📸 Found ${existingImages.length} existing gallery images`);

    const sampleImages = [
      {
        title: 'Amazing Catan Setup',
        description: 'Check out this beautiful Catan board setup! The hexes are perfectly arranged.',
        imageUrl: existingImages[0]?.imageUrl || '/DiceLogo.svg',
        thumbnailUrl: existingImages[0]?.thumbnailUrl || '/DiceLogo.svg',
        category: 'gallery',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 24, downvotes: 2 }),
        views: 156,
        downloads: 8,
        comments: 8
      },
      {
        title: 'Pandemic Legacy Board',
        description: 'Ready for our next session! The board is looking intense.',
        imageUrl: existingImages[1]?.imageUrl || '/DiceLogo.svg',
        thumbnailUrl: existingImages[1]?.thumbnailUrl || '/DiceLogo.svg',
        category: 'gallery',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 19, downvotes: 1 }),
        views: 89,
        downloads: 5,
        comments: 6
      },
      {
        title: 'Wingspan Beautiful Setup',
        description: 'The Wingspan board is so gorgeous! Love the bird illustrations.',
        imageUrl: existingImages[2]?.imageUrl || '/DiceLogo.svg',
        thumbnailUrl: existingImages[2]?.thumbnailUrl || '/DiceLogo.svg',
        category: 'gallery',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 31, downvotes: 0 }),
        views: 203,
        downloads: 12,
        comments: 14
      },
      {
        title: 'Game Collection Display',
        description: 'Finally organized my game collection! What do you think?',
        imageUrl: existingImages[3]?.imageUrl || '/DiceLogo.svg',
        thumbnailUrl: existingImages[3]?.thumbnailUrl || '/DiceLogo.svg',
        category: 'gallery',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 27, downvotes: 1 }),
        views: 178,
        downloads: 7,
        comments: 11
      },
      {
        title: 'Ark Nova First Play',
        description: 'First time playing Ark Nova! The zoo building mechanics are amazing.',
        imageUrl: existingImages[4]?.imageUrl || '/DiceLogo.svg',
        thumbnailUrl: existingImages[4]?.thumbnailUrl || '/DiceLogo.svg',
        category: 'gallery',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 16, downvotes: 0 }),
        views: 94,
        downloads: 3,
        comments: 9
      },
      {
        title: 'Game Night Setup',
        description: 'Perfect setup for our weekly game night! Multiple tables ready.',
        imageUrl: existingImages[5]?.imageUrl || '/DiceLogo.svg',
        thumbnailUrl: existingImages[5]?.thumbnailUrl || '/DiceLogo.svg',
        category: 'gallery',
        authorId: sampleUser.id,
        votes: JSON.stringify({ upvotes: 21, downvotes: 2 }),
        views: 127,
        downloads: 6,
        comments: 7
      }
    ];
    
    for (const imageData of sampleImages) {
      await prisma.galleryImage.create({
        data: imageData
      });
    }
    
    console.log('✅ Added 6 sample gallery images');
    
    console.log('🎉 Sample data added successfully!');
    console.log('📊 Total: 4 forum posts + 6 gallery images = 10 feed items');
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleData();

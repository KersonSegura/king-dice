const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addRealSampleData() {
  try {
    console.log('🔍 Checking for existing users...');
    let user = await prisma.user.findFirst({
      where: { username: 'kerson' }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: 'kerson',
          email: 'kerson@example.com',
          password: 'password123',
          isVerified: true,
          isAdmin: true,
          avatar: '/default-avatar.png',
        },
      });
      console.log('✅ Created new user: kerson');
    } else {
      console.log('✅ Using user: kerson');
    }

    const userId = user.id;

    // Add sample forum posts
    console.log('📝 Adding sample forum posts...');
    const forumPosts = [
      {
        title: 'Best Strategy Games for 2024',
        content: 'What are your top picks for strategy board games released or gaining popularity in 2024? Share your thoughts!',
        category: 'strategy',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 15, downvotes: 1 }),
        replies: 5,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        title: 'New Game Night Ideas',
        content: 'Looking for fresh ideas for our weekly game night. Any unique themes or challenges you\'ve tried recently?',
        category: 'general',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 20, downvotes: 0 }),
        replies: 8,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        title: 'Catan Tournament Results',
        content: 'Just finished our local Catan tournament! Congrats to the winner, it was a close one. Share your tournament experiences!',
        category: 'strategy',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 10, downvotes: 2 }),
        replies: 3,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        title: 'Pandemic Legacy Season 1 Complete!',
        content: 'We finally finished Pandemic Legacy Season 1! What an incredible journey. No spoilers, but wow. Highly recommend!',
        category: 'reviews',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 30, downvotes: 0 }),
        replies: 12,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
    ];

    for (const postData of forumPosts) {
      await prisma.post.create({ data: postData });
    }
    console.log(`✅ Added ${forumPosts.length} sample forum posts`);

    // Add sample gallery images with real image URLs
    console.log('🖼️ Adding sample gallery images...');
    const galleryImages = [
      {
        title: 'Amazing Catan Setup',
        description: 'Check out this beautiful Catan board setup! The hexes are perfectly arranged.',
        imageUrl: '/uploads/favorite-card-1759862086894.jpg',
        thumbnailUrl: '/uploads/favorite-card-1759862086894.jpg',
        category: 'gallery',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 24, downvotes: 2 }),
        views: 156,
        downloads: 8,
        comments: 8
      },
      {
        title: 'Pandemic Legacy Board',
        description: 'Ready for our next session! The board is looking intense.',
        imageUrl: '/uploads/favorite-card-1759862086894.jpg',
        thumbnailUrl: '/uploads/favorite-card-1759862086894.jpg',
        category: 'gallery',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 19, downvotes: 1 }),
        views: 89,
        downloads: 5,
        comments: 6
      },
      {
        title: 'Wingspan Beautiful Setup',
        description: 'The Wingspan board is so gorgeous! Love the bird illustrations.',
        imageUrl: '/uploads/favorite-card-1759862086894.jpg',
        thumbnailUrl: '/uploads/favorite-card-1759862086894.jpg',
        category: 'gallery',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 31, downvotes: 0 }),
        views: 203,
        downloads: 12,
        comments: 14
      },
      {
        title: 'Game Collection Display',
        description: 'Finally organized my game collection! What do you think?',
        imageUrl: '/uploads/favorite-card-1759862086894.jpg',
        thumbnailUrl: '/uploads/favorite-card-1759862086894.jpg',
        category: 'gallery',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 27, downvotes: 1 }),
        views: 178,
        downloads: 7,
        comments: 11
      },
      {
        title: 'Ark Nova First Play',
        description: 'First time playing Ark Nova! The zoo building mechanics are amazing.',
        imageUrl: '/uploads/favorite-card-1759862086894.jpg',
        thumbnailUrl: '/uploads/favorite-card-1759862086894.jpg',
        category: 'gallery',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 16, downvotes: 0 }),
        views: 94,
        downloads: 3,
        comments: 9
      },
      {
        title: 'Game Night Setup',
        description: 'Perfect setup for our weekly game night! Multiple tables ready.',
        imageUrl: '/uploads/favorite-card-1759862086894.jpg',
        thumbnailUrl: '/uploads/favorite-card-1759862086894.jpg',
        category: 'gallery',
        authorId: userId,
        votes: JSON.stringify({ upvotes: 21, downvotes: 2 }),
        views: 127,
        downloads: 6,
        comments: 7
      }
    ];
    
    for (const imageData of galleryImages) {
      await prisma.galleryImage.create({
        data: imageData
      });
    }
    console.log(`✅ Added ${galleryImages.length} sample gallery images`);

    console.log(`🎉 Sample data added successfully!`);
    console.log(`📊 Total: ${forumPosts.length} forum posts + ${galleryImages.length} gallery images = ${forumPosts.length + galleryImages.length} feed items`);

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRealSampleData();

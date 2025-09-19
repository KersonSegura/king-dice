const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testProfileData() {
  try {
    console.log('Testing profile data fetch...');
    
    const user = await prisma.user.findUnique({
      where: { id: 'user_1754498606845_aoutcys27' },
      select: { 
        bio: true,
        favoriteGames: true,
        profileColors: true,
        isAdmin: true
      }
    });
    
    console.log('User found:', user);
    
    if (user) {
      let favoriteGames = [];
      if (user.favoriteGames) {
        try {
          favoriteGames = JSON.parse(user.favoriteGames);
          console.log('Parsed favorite games:', favoriteGames);
        } catch (error) {
          console.error('Error parsing favorite games:', error);
        }
      }
      
      const response = {
        success: true,
        profile: {
          bio: user.bio || '',
          favoriteGames: favoriteGames,
          isAdmin: user.isAdmin || false
        }
      };
      
      console.log('Response:', JSON.stringify(response, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProfileData();

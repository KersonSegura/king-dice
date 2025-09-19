const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const user = await prisma.user.upsert({
      where: { id: 'user_1754498606845_aoutcys27' },
      update: {
        username: 'KingDiceKSA',
        email: 'kingdice@example.com',
        password: '',
        isAdmin: true,
        bio: null,
        favoriteGames: null,
        profileColors: null
      },
      create: {
        id: 'user_1754498606845_aoutcys27',
        username: 'KingDiceKSA',
        email: 'kingdice@example.com',
        password: '',
        isAdmin: true,
        bio: null,
        favoriteGames: null,
        profileColors: null
      }
    });
    
    console.log('Admin user created/updated successfully:', user);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();

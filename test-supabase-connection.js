// Test Supabase database connection
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSupabase() {
  try {
    console.log('🧪 Testing Supabase database connection...');
    
    // Test 1: Count games
    const gameCount = await prisma.game.count();
    console.log(`✅ Games in database: ${gameCount}`);
    
    // Test 2: Get a sample game
    const sampleGame = await prisma.game.findFirst({
      select: {
        id: true,
        name: true,
        year: true,
        category: true
      }
    });
    
    if (sampleGame) {
      console.log('✅ Sample game found:', sampleGame);
    } else {
      console.log('⚠️ No games found in database');
    }
    
    // Test 3: Count users
    const userCount = await prisma.user.count();
    console.log(`✅ Users in database: ${userCount}`);
    
    // Test 4: Test a simple query
    const recentGames = await prisma.game.findMany({
      take: 3,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });
    
    console.log(`✅ Recent games (${recentGames.length}):`, recentGames);
    
    console.log('🎉 Supabase connection is working perfectly!');
    
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSupabase();

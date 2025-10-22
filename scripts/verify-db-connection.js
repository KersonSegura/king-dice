const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function verifyConnection() {
  try {
    console.log('🔍 Checking database connection...\n');
    
    // Get connection info (without exposing password)
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('DATABASE_URL configured:', !!process.env.DATABASE_URL);
    
    // Test connection
    const result = await prisma.$queryRaw`SELECT current_database(), version();`;
    console.log('\n✅ Connected to database:', result[0].current_database);
    console.log('PostgreSQL version:', result[0].version.split(' ')[1]);
    
    // Count games
    const gameCount = await prisma.game.count();
    console.log('\n📊 Total games in database:', gameCount);
    
    // Check for game 8816
    const game8816 = await prisma.game.findUnique({
      where: { id: 8816 }
    });
    
    if (game8816) {
      console.log('✅ Game 8816 (Catan) EXISTS in this database');
    } else {
      console.log('❌ Game 8816 (Catan) NOT FOUND in this database');
    }
    
    // Show database URL (masked)
    const dbUrl = process.env.DATABASE_URL || '';
    const masked = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log('\n🔗 Database URL:', masked);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConnection();


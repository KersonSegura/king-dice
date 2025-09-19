const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllRules() {
  try {
    console.log('🗑️ Clearing all game rules from database...\n');
    
    // Count current rules
    const rulesCount = await prisma.gameRule.count();
    console.log(`📊 Current rules in database: ${rulesCount}`);
    
    if (rulesCount === 0) {
      console.log('✅ No rules to clear!');
      return;
    }
    
    // Delete all rules
    const deleteResult = await prisma.gameRule.deleteMany({});
    console.log(`🗑️ Deleted ${deleteResult.count} rules from database`);
    
    // Verify deletion
    const remainingRules = await prisma.gameRule.count();
    console.log(`📊 Remaining rules: ${remainingRules}`);
    
    if (remainingRules === 0) {
      console.log('✅ All rules cleared successfully!');
    } else {
      console.log('❌ Some rules still remain');
    }
    
  } catch (error) {
    console.error('❌ Error clearing rules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllRules();

const fs = require('fs');
const path = require('path');

function showInstructions() {
  const sqlPath = path.join(__dirname, '../database/migrations/create_post_votes_table.sql');
  
  console.log('\n🚀 POST_VOTES TABLE CREATION INSTRUCTIONS\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('The post_votes table needs to be created in Supabase.\n');
  console.log('📋 Steps:\n');
  console.log('   1. Open your Supabase Dashboard');
  console.log('   2. Go to "SQL Editor" (left sidebar)');
  console.log('   3. Click "New query"');
  console.log('   4. Copy and paste the SQL from this file:');
  console.log(`      ${path.resolve(sqlPath)}\n`);
  console.log('   5. Click "Run" (or press Ctrl+Enter)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Also show the SQL content
  try {
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.log('📄 SQL Content:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(sql);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Could not read SQL file:', error.message);
  }
}

if (require.main === module) {
  showInstructions();
  console.log('✅ Instructions displayed. Please run the SQL in Supabase Dashboard.\n');
}

module.exports = { showInstructions };


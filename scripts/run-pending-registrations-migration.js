const fs = require('fs');
const path = require('path');

function showMigrationInstructions() {
  console.log('\n🚀 PENDING_REGISTRATIONS MIGRATION INSTRUCTIONS\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('The pending_registrations table needs a verification_code column.\n');
  console.log('📋 Steps to run the migration:\n');
  console.log('   1. Open your Supabase Dashboard');
  console.log('   2. Go to "SQL Editor" (left sidebar)');
  console.log('   3. Click "New query"');
  console.log('   4. Copy and paste the SQL below');
  console.log('   5. Click "Run" (or press Ctrl+Enter)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Read and display the SQL content
  try {
    const sqlPath = path.join(__dirname, '../supabase/migrations/add_verification_code_to_pending_registrations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.log('📄 SQL Migration:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(sql);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Could not read SQL file:', error.message);
    console.log('\nPlease check: supabase/migrations/add_verification_code_to_pending_registrations.sql\n');
  }
}

if (require.main === module) {
  showMigrationInstructions();
}

module.exports = { showMigrationInstructions };

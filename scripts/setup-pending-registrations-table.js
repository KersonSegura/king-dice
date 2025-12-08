const fs = require('fs');
const path = require('path');

function showSetupInstructions() {
  console.log('\n🚀 SETUP PENDING_REGISTRATIONS TABLE\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('The pending_registrations table needs to be created FIRST.\n');
  console.log('Then we can add the verification_code column.\n');
  console.log('📋 Steps:\n');
  console.log('   STEP 1: Create the table (run this SQL first)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Show table creation SQL
  try {
    const tableSqlPath = path.join(__dirname, '../supabase/migrations/create_pending_registrations_table.sql');
    const tableSql = fs.readFileSync(tableSqlPath, 'utf-8');
    console.log('📄 SQL to CREATE the table:\n');
    console.log(tableSql);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Could not read table creation SQL file:', error.message);
  }
  
  console.log('\n   STEP 2: Add verification_code column (run this SQL after table is created)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Show column addition SQL
  try {
    const columnSqlPath = path.join(__dirname, '../supabase/migrations/add_verification_code_to_pending_registrations.sql');
    const columnSql = fs.readFileSync(columnSqlPath, 'utf-8');
    console.log('📄 SQL to ADD the column:\n');
    console.log(columnSql);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Could not read column addition SQL file:', error.message);
  }
  
  console.log('\n📋 Instructions:\n');
  console.log('   1. Go to Supabase Dashboard → SQL Editor');
  console.log('   2. Run STEP 1 SQL first (create table)');
  console.log('   3. Wait for "Success. No rows returned"');
  console.log('   4. Run STEP 2 SQL (add column)');
  console.log('   5. Wait for "Success. No rows returned"');
  console.log('   6. Done! ✅\n');
}

if (require.main === module) {
  showSetupInstructions();
}

module.exports = { showSetupInstructions };


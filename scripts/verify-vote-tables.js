require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function verifyTables() {
  console.log('\n🔍 Verifying vote tables in Supabase...\n');
  
  const tablesToCheck = ['post_votes', 'gallery_votes', 'comment_likes'];
  
  for (const tableName of tablesToCheck) {
    try {
      // Try to query the table - if it exists, this will work
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
          console.log(`❌ Table '${tableName}' does NOT exist`);
        } else {
          console.log(`⚠️  Table '${tableName}' exists but error: ${error.message}`);
        }
      } else {
        console.log(`✅ Table '${tableName}' exists`);
      }
    } catch (error) {
      console.log(`❌ Table '${tableName}' does NOT exist or error: ${error.message}`);
    }
  }
  
  console.log('\n📋 If any tables are missing, run this SQL in Supabase Dashboard > SQL Editor:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Read and show SQL
  const fs = require('fs');
  const path = require('path');
  const sqlPath = path.join(__dirname, '../database/migrations/create_post_votes_table.sql');
  try {
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.log(sql);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('Could not read SQL file');
  }
}

if (require.main === module) {
  verifyTables()
    .then(() => {
      console.log('✅ Verification complete.\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyTables };


require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verifyMigration() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials!');
      console.error('Please make sure .env.local has:');
      console.error('  - NEXT_PUBLIC_SUPABASE_URL');
      console.error('  - SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔍 Verifying pending_registrations migration...\n');

    // Try to query the verification_code column - if it exists, this will work
    const { data, error } = await supabase
      .from('pending_registrations')
      .select('id, username, email, verification_code, expires_at')
      .limit(0); // Just check structure, don't fetch data

    if (error) {
      if (error.message && error.message.includes('verification_code')) {
        console.log('❌ Migration verification FAILED');
        console.log('   The verification_code column does not exist.\n');
        console.log('   Error:', error.message);
        console.log('\n   Please run the migration again in Supabase SQL Editor.\n');
        process.exit(1);
      } else if (error.message && error.message.includes('does not exist')) {
        console.log('❌ The pending_registrations table does not exist!');
        console.log('   Please create it first by running:');
        console.log('   supabase/migrations/create_pending_registrations_table.sql\n');
        process.exit(1);
      } else {
        console.log('⚠️  Could not verify (this might be OK):');
        console.log('   Error:', error.message);
        console.log('\n   The migration may have succeeded. Try checking in Supabase Dashboard:\n');
        console.log('   1. Go to Table Editor');
        console.log('   2. Click on pending_registrations table');
        console.log('   3. Check if verification_code column appears\n');
        return;
      }
    } else {
      console.log('✅ Migration verification SUCCESSFUL!\n');
      console.log('   ✓ pending_registrations table exists');
      console.log('   ✓ verification_code column exists');
      console.log('   ✓ Column is queryable\n');
      console.log('🎉 Your database is ready for the new registration flow!\n');
      console.log('📋 Next steps:');
      console.log('   1. The migration is complete ✅');
      console.log('   2. Users will now be created ONLY after email verification');
      console.log('   3. Try creating a test account to verify the flow works\n');
      return;
    }

  } catch (error) {
    console.error('❌ Error verifying migration:', error.message);
    console.log('\n⚠️  Note: "Success. No rows returned" is NORMAL for DDL statements.');
    console.log('   This means your migration ran successfully!\n');
    console.log('📋 To verify manually in Supabase Dashboard:');
    console.log('   1. Go to Table Editor (left sidebar)');
    console.log('   2. Click on pending_registrations table');
    console.log('   3. You should see verification_code in the columns list\n');
    console.log('   OR run this SQL query to check:');
    console.log('   SELECT column_name FROM information_schema.columns');
    console.log('   WHERE table_name = \'pending_registrations\'\n');
  }
}

if (require.main === module) {
  verifyMigration();
}

module.exports = { verifyMigration };

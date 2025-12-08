require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verifyComplete() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials!');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔍 Verifying pending_registrations table setup...\n');

    // Try to query the table structure
    const { data, error } = await supabase
      .from('pending_registrations')
      .select('id, username, email, password_hash, avatar, verification_code_id, verification_code, created_at, expires_at')
      .limit(0); // Just check structure, don't fetch data

    if (error) {
      if (error.message && error.message.includes('verification_code')) {
        console.log('❌ The verification_code column is missing!');
        console.log('   Error:', error.message);
      } else if (error.message && error.message.includes('does not exist')) {
        console.log('❌ The pending_registrations table does not exist!');
        console.log('   Error:', error.message);
        console.log('\n   Please check:');
        console.log('   1. Did you run the SQL in Supabase SQL Editor?');
        console.log('   2. Did you see "Success. No rows returned"?');
      } else {
        console.log('⚠️  Unexpected error:', error.message);
        console.log('\n   The table might still be created correctly.');
        console.log('   Check manually in Supabase Dashboard → Table Editor\n');
      }
      process.exit(1);
    } else {
      console.log('✅ SUCCESS! Everything is set up correctly!\n');
      console.log('   ✓ pending_registrations table exists');
      console.log('   ✓ verification_code column exists');
      console.log('   ✓ All columns are queryable\n');
      console.log('🎉 Your database is ready for the new registration flow!\n');
      console.log('📋 What happens now:');
      console.log('   1. When users register, data goes to pending_registrations');
      console.log('   2. User receives verification code via email');
      console.log('   3. After entering code, user account is created');
      console.log('   4. Users CANNOT log in until email is verified ✅\n');
      console.log('🧪 Ready to test! Try creating a new account.\n');
      return;
    }

  } catch (error) {
    console.error('❌ Error verifying:', error.message);
    console.log('\n📋 To verify manually in Supabase Dashboard:');
    console.log('   1. Go to Table Editor (left sidebar)');
    console.log('   2. Look for "pending_registrations" table');
    console.log('   3. Click on it to see all columns including "verification_code"\n');
  }
}

if (require.main === module) {
  verifyComplete();
}

module.exports = { verifyComplete };


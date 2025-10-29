/**
 * Test Supabase Storage URLs
 * Verifies that files can be accessed via public URLs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testUrls() {
  console.log('🔍 Testing Supabase Storage URLs...\n');

  const bucketName = 'uploads';
  
  try {
    // List all files in uploads bucket
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      console.error('❌ Error listing files:', error);
      return;
    }

    console.log(`Found ${files?.length || 0} files in "${bucketName}" bucket:\n`);

    for (const file of files || []) {
      const publicUrl = supabase.storage.from(bucketName).getPublicUrl(file.name);
      console.log(`📄 File: ${file.name}`);
      console.log(`   URL: ${publicUrl.data.publicUrl}`);
      console.log(`   Size: ${(file.metadata?.size / 1024).toFixed(2)} KB`);
      console.log(`   Created: ${file.created_at}`);
      
      // Test if URL is accessible
      try {
        const response = await fetch(publicUrl.data.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log(`   Status: ✅ Accessible (${response.status})`);
        } else {
          console.log(`   Status: ❌ Not accessible (${response.status} ${response.statusText})`);
        }
      } catch (fetchError) {
        console.log(`   Status: ❌ Error testing URL: ${fetchError.message}`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUrls().catch(console.error);


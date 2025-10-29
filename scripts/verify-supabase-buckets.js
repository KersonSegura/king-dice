/**
 * Verify Supabase Storage Buckets Configuration
 * Checks if buckets are public and accessible
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

async function verifyBuckets() {
  console.log('🔍 Verifying Supabase Storage buckets...\n');

  const buckets = ['gallery', 'uploads', 'rules-images', 'boardle-images', 'dice-designs'];

  for (const bucketName of buckets) {
    try {
      // Check if bucket exists and is public
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        throw listError;
      }

      const bucket = buckets.find(b => b.name === bucketName);

      if (!bucket) {
        console.log(`❌ Bucket "${bucketName}" does not exist`);
        continue;
      }

      console.log(`✓ Bucket "${bucketName}":`);
      console.log(`  - Public: ${bucket.public ? '✅ YES' : '❌ NO (needs to be public!)'}`);
      console.log(`  - Created: ${bucket.created_at}`);

      if (!bucket.public) {
        console.log(`  ⚠️  WARNING: This bucket needs to be public for images to be accessible!`);
        console.log(`     Run: npm run setup:storage to fix this`);
      } else {
        // Try to list files in the bucket (to verify access)
        const { data: files, error: listFilesError } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 5 });

        if (listFilesError) {
          console.log(`  ⚠️  Cannot list files: ${listFilesError.message}`);
        } else {
          console.log(`  - Files found: ${files?.length || 0}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking bucket "${bucketName}":`, error.message);
    }
  }

  console.log('\n📋 To make buckets public, run: npm run setup:storage');
}

verifyBuckets().catch(console.error);


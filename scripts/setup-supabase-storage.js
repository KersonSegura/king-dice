/**
 * Setup Supabase Storage Buckets
 * Run this script to create the necessary storage buckets in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const buckets = [
  { name: 'gallery', public: true },
  { name: 'rules-images', public: true },
  { name: 'uploads', public: true },
  { name: 'boardle-images', public: true },
  { name: 'dice-designs', public: true },
  { name: 'PDFs', public: true }, // For game PDF rulebooks
];

async function setupBuckets() {
  console.log('🚀 Setting up Supabase Storage buckets...\n');

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        throw listError;
      }

      const bucketExists = existingBuckets.find(b => b.name === bucket.name);

      if (bucketExists) {
        console.log(`✓ Bucket "${bucket.name}" already exists`);
      } else {
        // Create bucket
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          allowedMimeTypes: null, // Allow all file types
          fileSizeLimit: 52428800, // 50 MB limit per file
        });

        if (error) {
          throw error;
        }

        console.log(`✅ Created bucket "${bucket.name}"`);
      }
    } catch (error) {
      console.error(`❌ Error setting up bucket "${bucket.name}":`, error.message);
    }
  }

  console.log('\n🎉 Storage setup complete!');
  console.log('\n📦 Buckets configured:');
  buckets.forEach(bucket => {
    console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
  });
}

setupBuckets().catch(console.error);

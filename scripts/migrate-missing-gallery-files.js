/**
 * Migrate missing gallery files to Supabase Storage
 * Migrates only the files referenced in data/gallery.json
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function migrateGalleryFiles() {
  console.log('🚀 Migrating missing gallery files to Supabase Storage...\n');

  // Read gallery.json to get all image URLs
  const galleryPath = path.join(process.cwd(), 'data', 'gallery.json');
  const galleryData = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
  
  const images = galleryData.images || [];
  console.log(`Found ${images.length} images in gallery.json\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const image of images) {
    const imageUrl = image.imageUrl || image.thumbnailUrl;
    if (!imageUrl) {
      console.log(`⚠️  Skipping ${image.id}: No imageUrl`);
      skipped++;
      continue;
    }

    // Skip if already a Supabase URL
    if (imageUrl.includes('supabase.co')) {
      console.log(`✓ Already in Supabase: ${image.id}`);
      skipped++;
      continue;
    }

    // Extract filename from path
    let filename;
    let bucket;
    
    if (imageUrl.startsWith('/gallery/')) {
      filename = imageUrl.replace('/gallery/', '');
      bucket = 'gallery';
    } else if (imageUrl.startsWith('/uploads/')) {
      filename = imageUrl.replace('/uploads/', '');
      bucket = 'uploads';
      // Files are actually in uploads/uploads/ subfolder
      filename = `uploads/${filename}`;
    } else {
      console.log(`⚠️  Unknown path format: ${imageUrl}`);
      skipped++;
      continue;
    }

    // Check local file
    const localPath = path.join(process.cwd(), 'public', imageUrl.replace('/', ''));
    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  Local file not found: ${localPath}`);
      skipped++;
      continue;
    }

    // Check if already exists in Supabase
    const { data: existing } = await supabase.storage
      .from(bucket)
      .list(bucket === 'uploads' ? 'uploads' : '', { search: filename.split('/').pop() });

    if (existing && existing.length > 0) {
      console.log(`✓ Already exists in Supabase: ${filename}`);
      skipped++;
      continue;
    }

    // Upload to Supabase
    try {
      const fileBuffer = fs.readFileSync(localPath);
      const ext = path.extname(localPath).toLowerCase();
      const contentType = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }[ext] || 'application/octet-stream';

      console.log(`📤 Uploading ${filename} to ${bucket}...`);
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, fileBuffer, {
          contentType,
          upsert: true
        });

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errors++;
        continue;
      }

      console.log(`  ✅ Uploaded: ${image.id} (${filename})`);
      uploaded++;
    } catch (error) {
      console.error(`  ❌ Exception: ${error.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`  ✅ Uploaded: ${uploaded}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`\n🎉 Done!`);
}

migrateGalleryFiles().catch(console.error);


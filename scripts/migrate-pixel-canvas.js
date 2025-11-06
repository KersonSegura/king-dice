// Node.js version of the migration script (no TypeScript compilation needed)
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Load Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migratePixelCanvas() {
  console.log('🎨 Starting Pixel Canvas migration...\n');

  // Read old pixel canvas JSON
  const dataPath = path.join(__dirname, '..', 'data', 'pixel-canvas.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ File not found:', dataPath);
    process.exit(1);
  }

  console.log('📖 Reading pixel-canvas.json...');
  const fileContent = fs.readFileSync(dataPath, 'utf-8');
  const oldCanvas = JSON.parse(fileContent);

  console.log(`✅ Loaded ${oldCanvas.pixels.length} pixels from JSON file\n`);

  // Check if canvas already exists
  const { data: existingCanvas } = await supabase
    .from('pixel_canvas')
    .select('*')
    .eq('id', 'main-canvas')
    .maybeSingle();

  if (!existingCanvas) {
    console.log('📝 Creating canvas metadata...');
    await supabase
      .from('pixel_canvas')
      .insert({
        id: 'main-canvas',
        width: oldCanvas.width,
        height: oldCanvas.height,
        total_pixels: oldCanvas.totalPixels,
        unique_users: oldCanvas.uniqueUsers,
        last_updated: oldCanvas.lastUpdated
      });
    console.log('✅ Canvas metadata created\n');
  } else {
    console.log('✅ Canvas metadata already exists\n');
  }

  // Check how many pixels are already in the database
  const { count: existingCount } = await supabase
    .from('pixel_placements')
    .select('*', { count: 'exact', head: true })
    .eq('canvas_id', 'main-canvas');

  console.log(`📊 Current pixels in database: ${existingCount || 0}`);
  
  if (existingCount && existingCount > 0) {
    console.log('⚠️  Warning: Database already has pixels. This will add/update pixels from the JSON file.');
    console.log('   Duplicate coordinates will be updated with the JSON data.\n');
  }

  // Prepare pixels for insertion
  console.log('🔄 Preparing pixels for insertion...');
  const pixelsToInsert = oldCanvas.pixels.map((pixel, index) => ({
    id: `px_migrated_${Date.now()}_${index}`,
    canvas_id: 'main-canvas',
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    user_id: pixel.userId,
    username: pixel.username,
    placed_at: pixel.timestamp,
    created_at: pixel.timestamp,
    updated_at: pixel.timestamp
  }));

  // Insert in batches (Supabase has a limit)
  const batchSize = 1000;
  const totalBatches = Math.ceil(pixelsToInsert.length / batchSize);
  let successCount = 0;
  let errorCount = 0;

  console.log(`📦 Inserting ${pixelsToInsert.length} pixels in ${totalBatches} batches...\n`);

  for (let i = 0; i < pixelsToInsert.length; i += batchSize) {
    const batch = pixelsToInsert.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    try {
      const { error } = await supabase
        .from('pixel_placements')
        .upsert(batch, {
          onConflict: 'canvas_id,x,y',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`❌ Error in batch ${batchNumber}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`✅ Batch ${batchNumber}/${totalBatches} complete (${successCount}/${pixelsToInsert.length} pixels)`);
      }
    } catch (err) {
      console.error(`❌ Exception in batch ${batchNumber}:`, err);
      errorCount += batch.length;
    }
  }

  // Update canvas statistics
  console.log('\n📊 Updating canvas statistics...');
  
  const { data: allPixels } = await supabase
    .from('pixel_placements')
    .select('user_id')
    .eq('canvas_id', 'main-canvas');

  const totalPixels = allPixels?.length || 0;
  const uniqueUsers = new Set(allPixels?.map(p => p.user_id) || []).size;

  await supabase
    .from('pixel_canvas')
    .update({
      total_pixels: totalPixels,
      unique_users: uniqueUsers,
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', 'main-canvas');

  console.log('\n✅ Migration complete!');
  console.log(`📊 Final stats:`);
  console.log(`   - Total pixels: ${totalPixels}`);
  console.log(`   - Unique users: ${uniqueUsers}`);
  console.log(`   - Successfully migrated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   - Errors: ${errorCount}`);
  }
  console.log('\n🎉 Your pixel canvas artwork has been restored!');
}

// Run migration
migratePixelCanvas()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });


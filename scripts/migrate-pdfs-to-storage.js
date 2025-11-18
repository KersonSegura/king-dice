/**
 * Migrate existing base64 PDFs from database to Supabase Storage
 * This script will:
 * 1. Find all games with pdfFile (base64) but no pdfUrl
 * 2. Upload each PDF to Supabase Storage
 * 3. Update the game with the new pdfUrl
 * 4. Clear the pdfFile field to free up database space
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

async function migratePDFsToStorage() {
  console.log('🚀 Migrating PDFs from database to Supabase Storage...\n');

  try {
    // Find all games with pdfFile (base64) but no pdfUrl
    const { data: games, error: fetchError } = await supabase
      .from('games')
      .select('id, name_en, nameEn, name, pdf_file, pdfFile, pdf_url, pdfUrl')
      .or('pdf_file.not.is.null,pdfFile.not.is.null')
      .is('pdf_url', null)
      .is('pdfUrl', null);

    if (fetchError) {
      console.error('❌ Error fetching games:', fetchError);
      return;
    }

    if (!games || games.length === 0) {
      console.log('✅ No games with base64 PDFs found. Nothing to migrate!');
      return;
    }

    console.log(`📋 Found ${games.length} games with base64 PDFs to migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const gameId = game.id;
      const gameName = game.name_en || game.nameEn || game.name || `game-${gameId}`;
      const pdfFile = game.pdf_file || game.pdfFile;

      if (!pdfFile) {
        console.log(`⏭️  [${i + 1}/${games.length}] Skipping game ${gameId} (${gameName}): No PDF file found`);
        continue;
      }

      try {
        console.log(`\n📄 [${i + 1}/${games.length}] Processing: ${gameName} (ID: ${gameId})`);

        // Extract base64 data
        const base64Data = pdfFile.replace(/^data:application\/pdf;base64,/, '');
        if (!base64Data) {
          console.log(`   ⚠️  Invalid base64 data, skipping`);
          errorCount++;
          continue;
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        const fileSizeKB = Math.round(buffer.length / 1024);
        const fileSizeMB = (fileSizeKB / 1024).toFixed(2);
        
        console.log(`   📊 PDF size: ${fileSizeKB} KB (${fileSizeMB} MB)`);

        // Generate filename
        const timestamp = Date.now();
        const filename = `game-${gameId}-${timestamp}.pdf`;
        const filePath = `pdfs/${filename}`;

        // Upload to Supabase Storage
        console.log(`   📤 Uploading to Supabase Storage...`);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(filePath, buffer, {
            contentType: 'application/pdf',
            upsert: false, // Don't overwrite if exists
          });

        if (uploadError) {
          console.error(`   ❌ Upload error:`, uploadError.message);
          errorCount++;
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('pdfs')
          .getPublicUrl(uploadData.path);

        const publicUrl = urlData.publicUrl;
        console.log(`   ✅ Uploaded! URL: ${publicUrl}`);

        // Update game with new URL and clear base64
        console.log(`   💾 Updating game record...`);
        const { error: updateError } = await supabase
          .from('games')
          .update({
            pdf_url: publicUrl,
            pdf_file: null, // Clear base64 to free up space
          })
          .eq('id', gameId);

        if (updateError) {
          console.error(`   ❌ Update error:`, updateError.message);
          errorCount++;
          continue;
        }

        console.log(`   ✅ Successfully migrated!`);
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Error processing game ${gameId}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total processed: ${games.length}`);

    if (successCount > 0) {
      console.log(`\n🎉 Migration complete! ${successCount} PDFs are now in Supabase Storage.`);
      console.log(`💾 Database space freed up by removing base64 data.`);
    }

  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
  }
}

migratePDFsToStorage().catch(console.error);


/**
 * Script to list all games that need Spanish descriptions translated
 * This creates a CSV file with game IDs, names, and English descriptions
 * that can be manually translated
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Create Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

async function listUntranslatedDescriptions() {
  try {
    console.log('📥 Fetching games with English descriptions...');
    
    // Get all English descriptions
    const { data: englishDescriptions, error: fetchError } = await supabaseAdmin
      .from('game_descriptions')
      .select('*')
      .eq('language', 'en')
      .not('fullDescription', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch descriptions: ${fetchError.message}`);
    }

    if (!englishDescriptions || englishDescriptions.length === 0) {
      console.log('ℹ️  No English descriptions found.');
      return;
    }

    console.log(`✅ Found ${englishDescriptions.length} English descriptions`);

    // Get all existing Spanish descriptions to skip
    const { data: spanishDescriptions } = await supabaseAdmin
      .from('game_descriptions')
      .select('gameId')
      .eq('language', 'es');

    const existingSpanishGameIds = new Set(
      (spanishDescriptions || []).map(d => d.gameId || d.game_id)
    );

    // Filter out games that already have Spanish descriptions
    const descriptionsToTranslate = englishDescriptions.filter(
      desc => !existingSpanishGameIds.has(desc.gameId || desc.game_id)
    );

    console.log(`📋 Found ${descriptionsToTranslate.length} games needing Spanish descriptions`);

    // Fetch game names for these IDs
    const gameIds = descriptionsToTranslate.map(d => d.gameId || d.game_id);
    
    const { data: games, error: gamesError } = await supabaseAdmin
      .from('games')
      .select('id, nameEn, nameEs')
      .in('id', gameIds);

    if (gamesError) {
      console.warn('Warning: Could not fetch game names:', gamesError.message);
    }

    const gameMap = new Map();
    if (games) {
      games.forEach(game => {
        gameMap.set(game.id, game);
      });
    }

    // Create CSV content
    let csvContent = 'Game ID,English Name,Spanish Name,English Description\n';
    
    for (const desc of descriptionsToTranslate) {
      const gameId = desc.gameId || desc.game_id;
      const game = gameMap.get(gameId);
      const gameNameEn = game ? (game.nameEn || game.name_en || '') : '';
      const gameNameEs = game ? (game.nameEs || game.name_es || '') : '';
      const description = (desc.fullDescription || desc.full_description || '').replace(/"/g, '""'); // Escape quotes for CSV
      
      csvContent += `"${gameId}","${gameNameEn}","${gameNameEs}","${description}"\n`;
    }

    // Save to file
    const filename = `untranslated-descriptions-${Date.now()}.csv`;
    fs.writeFileSync(filename, csvContent, 'utf8');
    
    console.log(`\n✅ Created file: ${filename}`);
    console.log(`   Contains ${descriptionsToTranslate.length} games that need translation`);
    console.log(`   You can open this CSV in Excel/Google Sheets to manually translate`);
    
    // Also create a JSON file for easier processing
    const jsonData = descriptionsToTranslate.map(desc => {
      const gameId = desc.gameId || desc.game_id;
      const game = gameMap.get(gameId);
      return {
        gameId: gameId,
        gameNameEn: game ? (game.nameEn || game.name_en || '') : '',
        gameNameEs: game ? (game.nameEs || game.name_es || '') : '',
        englishDescription: desc.fullDescription || desc.full_description || '',
        englishShortDescription: desc.shortDescription || desc.short_description || ''
      };
    });
    
    const jsonFilename = `untranslated-descriptions-${Date.now()}.json`;
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonData, null, 2), 'utf8');
    
    console.log(`✅ Also created JSON file: ${jsonFilename}`);
    console.log(`\n💡 You can manually translate these and then use a script to upload them`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

listUntranslatedDescriptions()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });


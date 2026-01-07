/**
 * Script to translate game descriptions from English to Spanish
 * This will fetch all games with English descriptions and translate them to Spanish
 * 
 * Usage: node scripts/translate-descriptions.js [--limit N] [--batch-size N] [--delay N]
 * 
 * Options:
 *   --limit N: Only translate N descriptions (for testing)
 *   --batch-size N: Process N descriptions at a time (default: 10)
 *   --delay N: Delay in ms between batches (default: 1000)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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

// Simple translation function using Google Translate API (free tier)
// If you have a Google Translate API key, replace this with the official API
async function translateText(text, targetLang = 'es') {
  if (!text || text.trim().length === 0) return text;
  
  try {
    // Using a free translation service - you may want to replace this with Google Translate API
    // For now, using a simple HTTP-based translation
    const response = await fetch('https://api.mymemory.translated.net/get', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const params = new URLSearchParams({
      q: text.substring(0, 500), // Limit to 500 chars per request
      langpair: `en|${targetLang}`,
    });
    
    const translateResponse = await fetch(`https://api.mymemory.translated.net/get?${params}`);
    const data = await translateResponse.json();
    
    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }
    
    // Fallback: return original text if translation fails
    console.warn('Translation failed, using original text');
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original on error
  }
}

// Better approach: Use Google Translate API if you have a key
async function translateWithGoogleAPI(text, targetLang = 'es') {
  // Uncomment and configure if you have Google Translate API key
  /*
  const { Translate } = require('@google-cloud/translate').v2;
  const translate = new Translate({ key: process.env.GOOGLE_TRANSLATE_API_KEY });
  
  const [translation] = await translate.translate(text, targetLang);
  return translation;
  */
  
  // For now, using the free service
  return translateText(text, targetLang);
}

// Clean and truncate text for short description
function createShortDescription(description) {
  if (!description) return '';
  if (description.length <= 200) return description;
  
  // Try to find a good sentence break
  const truncated = description.substring(0, 200);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > 140) {
    return description.substring(0, lastSentenceEnd + 1);
  }
  
  // Fallback to word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return description.substring(0, lastSpace) + '...';
}

async function translateDescriptions(options = {}) {
  const {
    limit = null, // null means no limit
    batchSize = 10,
    delay = 1000, // 1 second delay between batches
  } = options;

  console.log('🚀 Starting description translation...');
  console.log(`📋 Options: limit=${limit || 'none'}, batchSize=${batchSize}, delay=${delay}ms`);

  try {
    // Fetch all games with English descriptions that don't have Spanish descriptions
    console.log('📥 Fetching games with English descriptions...');
    
    // First, get all English descriptions
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

    if (descriptionsToTranslate.length === 0) {
      console.log('✅ All games already have Spanish descriptions!');
      return;
    }

    const toProcess = limit 
      ? descriptionsToTranslate.slice(0, limit)
      : descriptionsToTranslate;

    console.log(`🔄 Translating ${toProcess.length} descriptions...`);

    let successCount = 0;
    let errorCount = 0;

    // Process in batches
    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(toProcess.length / batchSize);

      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} descriptions)...`);

      for (const desc of batch) {
        try {
          const gameIdValue = desc.gameId || desc.game_id;
          console.log(`  🔄 Translating description for game ${gameIdValue}...`);
          
          // Get the full description text
          const fullDescText = desc.fullDescription || desc.full_description;
          if (!fullDescText) {
            console.log(`  ⏭️  Skipping - no full description`);
            continue;
          }
          
          // Translate full description
          const translatedFull = await translateText(fullDescText, 'es');
          
          // Translate short description if it exists and is different
          let translatedShort = null;
          const shortDescText = desc.shortDescription || desc.short_description;
          if (shortDescText && shortDescText !== fullDescText.substring(0, 200)) {
            translatedShort = await translateText(shortDescText, 'es');
          } else {
            // Create short description from translated full description
            translatedShort = createShortDescription(translatedFull);
          }
          
          // Try camelCase first
          const { error: upsertError } = await supabaseAdmin
            .from('game_descriptions')
            .upsert({
              gameId: gameIdValue,
              language: 'es',
              fullDescription: translatedFull,
              shortDescription: translatedShort,
            }, {
              onConflict: 'gameId,language'
            });

          if (upsertError) {
            // Try with snake_case column names
            const { error: snakeError } = await supabaseAdmin
              .from('game_descriptions')
              .upsert({
                game_id: gameIdValue,
                language: 'es',
                full_description: translatedFull,
                short_description: translatedShort,
              }, {
                onConflict: 'game_id,language'
              });

            if (snakeError) {
              throw new Error(`Upsert failed: ${upsertError.message} / ${snakeError.message}`);
            }
          }

          successCount++;
          console.log(`  ✅ Successfully translated description for game ${desc.gameId}`);

          // Small delay between individual translations to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          errorCount++;
          console.error(`  ❌ Error translating description for game ${desc.gameId}:`, error.message);
        }
      }

      // Delay between batches
      if (i + batchSize < toProcess.length) {
        console.log(`⏳ Waiting ${delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log('\n✅ Translation complete!');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total processed: ${toProcess.length}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
}

// Run the script
const args = process.argv.slice(2);
const options = {};

// Parse command line arguments
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace('--', '');
  const value = args[i + 1];
  if (key && value) {
    options[key] = isNaN(value) ? value : parseInt(value);
  }
}

translateDescriptions(options)
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });


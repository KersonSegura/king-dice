require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value'
});

async function fetchCategoriesFromBGG(bggId) {
  try {
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=0`;
    
    // Wait 2 seconds to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, */*'
      },
      validateStatus: (status) => status < 500
    });
    
    if (response.status !== 200) {
      return null;
    }
    
    const data = parser.parse(response.data);
    if (!data.items || !data.items.item) {
      return null;
    }
    
    const item = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
    if (!item.link) {
      return null;
    }
    
    const links = Array.isArray(item.link) ? item.link : [item.link];
    const categories = [];
    
    for (const link of links) {
      if (link.type === 'boardgamecategory') {
        const categoryName = link.value || link;
        if (categoryName && typeof categoryName === 'string') {
          categories.push(categoryName.trim());
        }
      }
    }
    
    return categories.length > 0 ? categories : null;
  } catch (error) {
    return null;
  }
}

async function addCategoriesToGame(gameId, categories) {
  try {
    // Use the API endpoint to update categories
    const response = await axios.put(
      `http://localhost:3000/api/boardgames/${gameId}`,
      { categories: categories },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    return response.status === 200;
  } catch (error) {
    // If local API doesn't work, update directly
    try {
      // Delete existing
      await supabaseAdmin.from('game_categories').delete().eq('gameId', gameId);
      
      // Add new categories
      for (const categoryName of categories) {
        // Find or create category
        let { data: existing } = await supabaseAdmin
          .from('categories')
          .select('*')
          .ilike('nameEn', categoryName)
          .limit(1);
        
        let categoryId;
        if (!existing || existing.length === 0) {
          const { data: newCat } = await supabaseAdmin
            .from('categories')
            .insert({ nameEn: categoryName, nameEs: categoryName })
            .select()
            .single();
          categoryId = newCat.id;
        } else {
          categoryId = existing[0].id;
        }
        
        await supabaseAdmin.from('game_categories').insert({
          gameId: gameId,
          categoryId: categoryId
        });
      }
      return true;
    } catch (dbError) {
      console.error(`Error adding categories to game ${gameId}:`, dbError.message);
      return false;
    }
  }
}

async function main() {
  console.log('🚀 Fetching categories for games without categories...\n');
  console.log('📋 Will process up to 100 games that need categories\n');
  
  const TARGET_COUNT = 100;
  let processed = 0;
  let added = 0;
  let skipped = 0;
  let failed = 0;
  let currentOffset = 0;
  const BATCH_SIZE = 50; // Fetch games in batches
  
  while (processed < TARGET_COUNT) {
    // Fetch next batch of games
    const { data: gameBatch, error: batchError } = await supabaseAdmin
      .from('games')
      .select('id, nameEn, bggId')
      .not('bggId', 'is', null)
      .order('id', { ascending: true })
      .range(currentOffset, currentOffset + BATCH_SIZE - 1);
    
    if (batchError) {
      console.error('Error fetching games batch:', batchError);
      break;
    }
    
    if (!gameBatch || gameBatch.length === 0) {
      console.log('\n✅ No more games to check!');
      break;
    }
    
    // Process each game in the batch - check one by one
    for (const game of gameBatch) {
      if (processed >= TARGET_COUNT) {
        break;
      }
      
      const totalChecked = processed + skipped + failed;
      console.log(`\n🎮 [Checked ${totalChecked + 1}] "${game.nameEn}" (ID: ${game.id}, BGG: ${game.bggId})`);
      
      // Check if this game already has categories
      const { count } = await supabaseAdmin
        .from('game_categories')
        .select('*', { count: 'exact', head: true })
        .eq('gameId', game.id);
      
      if ((count || 0) > 0) {
        console.log(`  ⏭️  Already has ${count} categories, skipping to next game...`);
        skipped++;
        continue; // Skip this one, check next game (don't increment processed)
      }
      
      // This game needs categories - fetch and add them
      console.log(`  🔍 No categories found! Fetching from BGG...`);
      
      // Fetch categories from BGG
      const categories = await fetchCategoriesFromBGG(game.bggId);
      
      if (!categories || categories.length === 0) {
        console.log(`  ⚠️  No categories found from BGG`);
        failed++;
        processed++; // Count as processed (we tried)
        continue;
      }
      
      console.log(`  ➕ Found ${categories.length} categories: ${categories.join(', ')}`);
      
      // Add categories
      const success = await addCategoriesToGame(game.id, categories);
      
      if (success) {
        console.log(`  ✅ Successfully added categories!`);
        added++;
      } else {
        console.log(`  ❌ Failed to add categories`);
        failed++;
      }
      
      processed++; // Count as processed (we fetched and tried to add)
      
      // Progress update every 10 processed games
      if (processed % 10 === 0) {
        console.log(`\n📊 Progress: Added ${added}/${TARGET_COUNT} | Skipped: ${skipped} | Failed: ${failed}`);
      }
    }
    
    // Move to next batch
    currentOffset += BATCH_SIZE;
    
    if (processed >= TARGET_COUNT) {
      break;
    }
  }
  
  console.log(`\n✅ COMPLETE!`);
  console.log(`   ✅ Added categories: ${added} games`);
  console.log(`   ⏭️  Skipped (already had): ${skipped} games`);
  console.log(`   ❌ Failed: ${failed} games`);
}

main().catch(console.error);


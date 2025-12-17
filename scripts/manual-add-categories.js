require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value'
});

async function fetchCategoriesFromBGG(bggId) {
  try {
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=0`;
    
    // Wait 3 seconds to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, */*'
      },
      validateStatus: (status) => status < 500
    });
    
    if (response.status === 200) {
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
    } else if (response.status === 202) {
      // BGG is processing, wait and retry
      console.log(`  ⏳ BGG processing request, waiting 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return await fetchCategoriesFromBGG(bggId);
    } else {
      console.log(`  ⚠️  BGG API returned status ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function addCategoriesToGame(gameId, categories) {
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
  } catch (error) {
    console.error(`Error adding categories: ${error.message}`);
    return false;
  }
}

async function main() {
  // Get first 24 games without categories
  const { data: allGames } = await supabaseAdmin
    .from('games')
    .select('id, nameEn, bggId')
    .not('bggId', 'is', null)
    .order('id', { ascending: true });
  
  const { data: gamesWithCats } = await supabaseAdmin
    .from('game_categories')
    .select('gameId');
  
  const gamesWithCatIds = new Set((gamesWithCats || []).map(gc => gc.gameId));
  const gamesWithoutCats = (allGames || []).filter(g => !gamesWithCatIds.has(g.id));
  const games = gamesWithoutCats.slice(0, 24);
  
  console.log(`🎯 Processing ${games.length} games without categories...\n`);
  
  let added = 0;
  let failed = 0;
  const failedGames = [];
  
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    console.log(`\n[${i + 1}/${games.length}] "${game.nameEn}" (ID: ${game.id}, BGG: ${game.bggId})`);
    
    const categories = await fetchCategoriesFromBGG(game.bggId);
    
    if (!categories || categories.length === 0) {
      console.log(`  ⚠️  No categories found`);
      failed++;
      failedGames.push({ id: game.id, name: game.nameEn, bggId: game.bggId });
      continue;
    }
    
    console.log(`  ➕ Found: ${categories.join(', ')}`);
    
    const success = await addCategoriesToGame(game.id, categories);
    
    if (success) {
      console.log(`  ✅ Added successfully!`);
      added++;
    } else {
      console.log(`  ❌ Failed to add to database`);
      failed++;
      failedGames.push({ id: game.id, name: game.nameEn, bggId: game.bggId });
    }
  }
  
  console.log(`\n✅ COMPLETE!`);
  console.log(`   ✅ Added: ${added} games`);
  console.log(`   ❌ Failed: ${failed} games`);
  
  if (failedGames.length > 0) {
    console.log(`\n⚠️  Games that need manual lookup:`);
    failedGames.forEach(g => console.log(`   - "${g.name}" (ID: ${g.id}, BGG: ${g.bggId})`));
  }
}

main().catch(console.error);


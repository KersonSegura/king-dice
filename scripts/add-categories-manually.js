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

// Common categories for popular games (as fallback)
const commonCategories = {
  13: ['Strategy Games', 'Economic', 'Negotiation'], // Catan (already done)
  167791: ['Strategy Games', 'Economic', 'Science Fiction'], // Terraforming Mars
  224517: ['Strategy Games', 'Economic', 'Industry / Manufacturing'], // Brass: Birmingham
  266192: ['Strategy Games', 'Economic', 'Animals'], // Wingspan
  237182: ['Strategy Games', 'Wargame', 'Fantasy'], // Root
  205637: ['Card Game', 'Fantasy', 'Horror'], // Arkham Horror: The Card Game
  244521: ['Family Game', 'Economic', 'Dice'], // Quacks of Quedlinburg
  312484: ['Strategy Games', 'Adventure', 'Exploration'], // Lost Ruins of Arnak
  342942: ['Strategy Games', 'Animals', 'Economic'], // Ark Nova
  366013: ['Racing', 'Sports'], // Heat: Pedal to the Metal
};

async function findOrCreateCategory(categoryName) {
  try {
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('*')
      .or(`nameEn.eq.${categoryName},nameEs.eq.${categoryName}`)
      .limit(1);
    
    if (existing && existing.length > 0) {
      return existing[0];
    }
    
    const { data: newCat, error } = await supabaseAdmin
      .from('categories')
      .insert({
        nameEn: categoryName,
        nameEs: categoryName
      })
      .select()
      .single();
    
    if (error) {
      console.error(`  ❌ Error creating category "${categoryName}":`, error.message);
      return null;
    }
    
    return newCat;
  } catch (error) {
    console.error(`  ❌ Error with category "${categoryName}":`, error.message);
    return null;
  }
}

async function fetchCategoriesFromBGG(bggId) {
  try {
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=0`;
    
    // Wait 3 seconds to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, */*'
      },
      validateStatus: (status) => status < 500
    });
    
    if (response.status !== 200) {
      console.log(`  ⚠️  BGG API returned status ${response.status} for BGG ID ${bggId}`);
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
    if (error.response) {
      console.log(`  ⚠️  BGG API error: ${error.response.status} for BGG ID ${bggId}`);
    } else {
      console.log(`  ⚠️  Error fetching from BGG: ${error.message}`);
    }
    return null;
  }
}

async function addCategoriesToGame(gameId, categories) {
  let addedCount = 0;
  
  for (const categoryName of categories) {
    const category = await findOrCreateCategory(categoryName);
    if (!category) continue;
    
    // Check if link exists
    const { data: existing } = await supabaseAdmin
      .from('game_categories')
      .select('*')
      .eq('gameId', gameId)
      .eq('categoryId', category.id)
      .limit(1);
    
    if (!existing || existing.length === 0) {
      const { error } = await supabaseAdmin
        .from('game_categories')
        .insert({
          gameId: gameId,
          categoryId: category.id
        });
      
      if (!error) {
        addedCount++;
        console.log(`    ✓ Added category: ${categoryName}`);
      }
    }
  }
  
  return addedCount;
}

async function main() {
  console.log('🚀 Starting manual category addition...\n');
  
  // Get all games with shop items
  const { data: shopItems, error: shopError } = await supabaseAdmin
    .from('game_shop_items')
    .select('gameId');
  
  if (shopError) {
    console.error('❌ Error fetching shop items:', shopError);
    return;
  }
  
  const gameIds = [...new Set((shopItems || []).map(item => item.gameId))];
  console.log(`📦 Found ${gameIds.length} games with shop items\n`);
  
  // Get game details
  const { data: games, error: gamesError } = await supabaseAdmin
    .from('games')
    .select('id, nameEn, bggId')
    .in('id', gameIds);
  
  if (gamesError) {
    console.error('❌ Error fetching games:', gamesError);
    return;
  }
  
  let totalAdded = 0;
  let totalSkipped = 0;
  
  for (const game of games) {
    console.log(`\n🎮 Processing: "${game.nameEn}" (ID: ${game.id}, BGG ID: ${game.bggId || 'none'})`);
    
    // Check if already has categories
    const { count } = await supabaseAdmin
      .from('game_categories')
      .select('*', { count: 'exact', head: true })
      .eq('gameId', game.id);
    
    if ((count || 0) > 0) {
      console.log(`  ⏭️  Already has ${count} categories, skipping`);
      totalSkipped++;
      continue;
    }
    
    let categories = null;
    
    // Try to fetch from BGG API if bggId exists
    if (game.bggId) {
      console.log(`  📡 Fetching from BGG API...`);
      categories = await fetchCategoriesFromBGG(game.bggId);
    }
    
    // Fallback to common categories if BGG API fails
    if (!categories && commonCategories[game.bggId]) {
      console.log(`  📚 Using common categories from lookup table`);
      categories = commonCategories[game.bggId];
    }
    
    if (!categories || categories.length === 0) {
      console.log(`  ⚠️  No categories found`);
      continue;
    }
    
    console.log(`  ➕ Adding ${categories.length} categories: ${categories.join(', ')}`);
    const added = await addCategoriesToGame(game.id, categories);
    totalAdded += added;
    
    if (added > 0) {
      console.log(`  ✅ Successfully added ${added} categories`);
    }
  }
  
  console.log(`\n✅ COMPLETE!`);
  console.log(`   ➕ Added categories to: ${totalAdded} games`);
  console.log(`   ⏭️  Skipped: ${totalSkipped} games (already had categories)`);
}

main().catch(console.error);


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

// The 24 games that need categories
const games = [
  { id: 380, name: "Bloodline \"The Family Tree\"", bggId: 96748 },
  { id: 381, name: "BLURT OFF! Family Edition", bggId: 413491 },
  { id: 382, name: "The Bob Evans Restaurant Family Game!", bggId: 51616 },
  { id: 383, name: "Bob's Burgers: Belcher Family Food Fight", bggId: 291100 },
  { id: 384, name: "Books of Time: Our Family Plays Games Promo", bggId: 443958 },
  { id: 385, name: "Brains Family: Burgen & Drachen", bggId: 244948 },
  { id: 386, name: "Happy Families", bggId: 21389 },
  { id: 387, name: "Call It: the Family Home Football Game", bggId: 29331 },
  { id: 388, name: "Canadian Trivia Family Edition", bggId: 138693 },
  { id: 389, name: "Cards Against Humanity: 12 Days of Holiday Bullshit", bggId: 152366 },
  { id: 390, name: "Cards Against Humanity: Family Edition", bggId: 317367 },
  { id: 391, name: "Cards Against Humanity: Family Edition – School Sucks Pack", bggId: 397902 },
  { id: 392, name: "Cards Against Humanity: Family Edition – Smarty Pants Pack", bggId: 397903 },
  { id: 393, name: "Cards Against Humanity: Family Edition – Written by Kids Pack", bggId: 368505 },
  { id: 394, name: "Catan: Family Edition", bggId: 147240 },
  { id: 395, name: "Catholic Family Bible Game", bggId: 16426 },
  { id: 396, name: "Cathood: Family & Friends", bggId: 433525 },
  { id: 397, name: "Change My Mind: For The Family", bggId: 452194 },
  { id: 398, name: "Chapters-Indigo Family Games Night Pack", bggId: 310590 },
  { id: 399, name: "Chicken Soup for the Family Soul", bggId: 7853 },
  { id: 400, name: "Clean Family", bggId: 310969 },
  { id: 402, name: "Codenames: Disney – Family Edition", bggId: 220775 },
  { id: 403, name: "Cranium: The Family Fun Game", bggId: 19796 },
  { id: 404, name: "The Crew: Family Adventure", bggId: 406299 }
];

async function fetchCategoriesFromBGG(bggId) {
  try {
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=0`;
    
    // Wait 3 seconds between requests to avoid rate limiting
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
      console.log(`  ⏳ BGG processing, waiting 5 seconds...`);
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
  console.log(`🎯 Processing ${games.length} games...\n`);
  
  let added = 0;
  let failed = 0;
  const failedGames = [];
  
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    console.log(`\n[${i + 1}/${games.length}] "${game.name}" (ID: ${game.id}, BGG: ${game.bggId})`);
    
    const categories = await fetchCategoriesFromBGG(game.bggId);
    
    if (!categories || categories.length === 0) {
      console.log(`  ⚠️  No categories found`);
      failed++;
      failedGames.push(game);
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
      failedGames.push(game);
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


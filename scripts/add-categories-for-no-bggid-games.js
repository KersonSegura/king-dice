require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Games without BGG ID that need categories - with BGG IDs and categories found via Google
const gamesToAdd = [
  { id: 8554, name: "Azul", bggId: 230802, categories: ["Abstract Strategy", "Pattern Building", "Tile Placement"] },
  { id: 9121, name: "Exploding Kittens", bggId: 172225, categories: ["Card Game", "Party Game", "Push Your Luck"] },
  { id: 10760, name: "Here to Slay", bggId: 302107, categories: ["Card Game", "Dice", "Fantasy", "Take That"] },
  // Add more as we find them
];

async function addBggId(gameId, bggId) {
  const { error } = await supabaseAdmin
    .from('games')
    .update({ bggId: bggId })
    .eq('id', gameId);
  
  if (error) {
    console.error(`Error updating BGG ID:`, error);
    return false;
  }
  return true;
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
        const { data: newCat, error: insertError } = await supabaseAdmin
          .from('categories')
          .insert({ nameEn: categoryName, nameEs: categoryName })
          .select()
          .single();
        
        if (insertError) {
          console.error(`Error creating category "${categoryName}":`, insertError);
          continue;
        }
        categoryId = newCat.id;
      } else {
        categoryId = existing[0].id;
      }
      
      // Check if link already exists
      const { data: existingLink } = await supabaseAdmin
        .from('game_categories')
        .select('id')
        .eq('gameId', gameId)
        .eq('categoryId', categoryId)
        .limit(1);
      
      if (!existingLink || existingLink.length === 0) {
        const { error: linkError } = await supabaseAdmin.from('game_categories').insert({
          gameId: gameId,
          categoryId: categoryId
        });
        
        if (linkError && linkError.code !== '23505') {
          console.error(`Error linking category "${categoryName}":`, linkError);
        }
      }
    }
    return true;
  } catch (error) {
    console.error(`Error adding categories: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`🎯 Processing ${gamesToAdd.length} games without BGG ID...\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (let i = 0; i < gamesToAdd.length; i++) {
    const game = gamesToAdd[i];
    console.log(`[${i + 1}/${gamesToAdd.length}] "${game.name}" (ID: ${game.id})`);
    
    // Add BGG ID first
    if (game.bggId) {
      console.log(`  📝 Adding BGG ID: ${game.bggId}`);
      const bggSuccess = await addBggId(game.id, game.bggId);
      if (!bggSuccess) {
        console.log(`  ❌ Failed to add BGG ID`);
        failed++;
        continue;
      }
    }
    
    // Add categories
    console.log(`  ➕ Adding categories: ${game.categories.join(', ')}`);
    const catSuccess = await addCategoriesToGame(game.id, game.categories);
    
    if (catSuccess) {
      console.log(`  ✅ Successfully updated!\n`);
      updated++;
    } else {
      console.log(`  ❌ Failed to add categories\n`);
      failed++;
    }
  }
  
  console.log(`\n✅ COMPLETE!`);
  console.log(`   ✅ Updated: ${updated} games`);
  console.log(`   ❌ Failed: ${failed} games`);
}

main().catch(console.error);


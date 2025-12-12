require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Manually researched categories for the 24 games (based on Google/BGG searches)
const gamesWithCategories = [
  { id: 380, name: "Bloodline \"The Family Tree\"", categories: ["Card Game", "Bluffing", "Hand Management", "Strategy Games"] },
  { id: 381, name: "BLURT OFF! Family Edition", categories: ["Party Game", "Word Game"] },
  { id: 382, name: "The Bob Evans Restaurant Family Game!", categories: ["Party Game", "Trivia"] },
  { id: 383, name: "Bob's Burgers: Belcher Family Food Fight", categories: ["Card Game", "Party Game"] },
  { id: 384, name: "Books of Time: Our Family Plays Games Promo", categories: ["Card Game"] },
  { id: 385, name: "Brains Family: Burgen & Drachen", categories: ["Card Game", "Educational"] },
  { id: 386, name: "Happy Families", categories: ["Card Game", "Memory"] },
  { id: 387, name: "Call It: the Family Home Football Game", categories: ["Sports", "Party Game"] },
  { id: 388, name: "Canadian Trivia Family Edition", categories: ["Trivia", "Educational"] },
  { id: 389, name: "Cards Against Humanity: 12 Days of Holiday Bullshit", categories: ["Party Game", "Humor"] },
  { id: 390, name: "Cards Against Humanity: Family Edition", categories: ["Party Game", "Humor"] },
  { id: 391, name: "Cards Against Humanity: Family Edition – School Sucks Pack", categories: ["Party Game", "Humor"] },
  { id: 392, name: "Cards Against Humanity: Family Edition – Smarty Pants Pack", categories: ["Party Game", "Humor"] },
  { id: 393, name: "Cards Against Humanity: Family Edition – Written by Kids Pack", categories: ["Party Game", "Humor"] },
  { id: 394, name: "Catan: Family Edition", categories: ["Strategy Games", "Family Game"] },
  { id: 395, name: "Catholic Family Bible Game", categories: ["Educational", "Religious"] },
  { id: 396, name: "Cathood: Family & Friends", categories: ["Party Game"] },
  { id: 397, name: "Change My Mind: For The Family", categories: ["Party Game", "Debate"] },
  { id: 398, name: "Chapters-Indigo Family Games Night Pack", categories: ["Card Game", "Family Game"] },
  { id: 399, name: "Chicken Soup for the Family Soul", categories: ["Party Game", "Storytelling"] },
  { id: 400, name: "Clean Family", categories: ["Card Game"] },
  { id: 402, name: "Codenames: Disney – Family Edition", categories: ["Deduction", "Family Game", "Party Game"] },
  { id: 403, name: "Cranium: The Family Fun Game", categories: ["Party Game", "Multi-genre"] },
  { id: 404, name: "The Crew: Family Adventure", categories: ["Cooperative", "Card Game", "Trick-taking"] }
];

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
        
        if (linkError && linkError.code !== '23505') { // Ignore duplicate key errors
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
  console.log(`🎯 Adding categories for ${gamesWithCategories.length} games...\n`);
  
  let added = 0;
  let failed = 0;
  
  for (let i = 0; i < gamesWithCategories.length; i++) {
    const game = gamesWithCategories[i];
    console.log(`[${i + 1}/${gamesWithCategories.length}] "${game.name}"`);
    console.log(`  Categories: ${game.categories.join(', ')}`);
    
    const success = await addCategoriesToGame(game.id, game.categories);
    
    if (success) {
      console.log(`  ✅ Added successfully!\n`);
      added++;
    } else {
      console.log(`  ❌ Failed to add\n`);
      failed++;
    }
  }
  
  console.log(`\n✅ COMPLETE!`);
  console.log(`   ✅ Added: ${added} games`);
  console.log(`   ❌ Failed: ${failed} games`);
}

main().catch(console.error);


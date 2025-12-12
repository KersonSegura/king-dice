require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Games without BGG ID - found via Google/BGG searches
const gamesData = [
  { id: 8554, name: "Azul", bggId: 230802, categories: ["Abstract Strategy", "Tile Placement", "Pattern Building"] },
  { id: 9121, name: "Exploding Kittens", bggId: 172225, categories: ["Card Game", "Party Game", "Push Your Luck", "Humor"] },
  { id: 10760, name: "Here to Slay", bggId: 302107, categories: ["Card Game", "Fantasy", "Dice"] },
  { id: 8709, name: "Blood Rage", bggId: 220308, categories: ["Strategy Games", "Area Movement", "Dice", "Miniatures"] },
  { id: 8555, name: "A Feast for Odin", bggId: 177736, categories: ["Strategy Games", "Economic", "Tile Placement"] },
  { id: 8557, name: "A Game of Thrones", bggId: 103343, categories: ["Strategy Games", "Political", "Area Control"] },
  { id: 9186, name: "Fluxx", bggId: 258, categories: ["Card Game", "Party Game"] },
  { id: 8548, name: "6 nimmt!", bggId: 432, categories: ["Card Game", "Party Game"] },
  { id: 9609, name: "Mancala", bggId: 2542, categories: ["Abstract Strategy", "Ancient"] },
  { id: 9269, name: "Goa", bggId: 31481, categories: ["Strategy Games", "Economic", "Auction"] },
  { id: 8716, name: "Blueprints", bggId: 144734, categories: ["Strategy Games", "Dice", "Set Collection"] },
  { id: 8553, name: "A Castle for All Seasons", bggId: 35677, categories: ["Strategy Games", "Card Game", "City Building"] },
  { id: 8556, name: "A Few Acres of Snow", bggId: 104006, categories: ["Strategy Games", "Card Game", "Deck Building", "Wargame"] },
  { id: 8546, name: "51st State: Master Set", bggId: 181304, categories: ["Strategy Games", "Card Game", "Engine Building"] },
  // Add remaining games as we find them
  { id: 8547, name: "5211", bggId: null, categories: ["Card Game"] }, // May not have BGG entry
  { id: 8688, name: "Bermuda Pirates", bggId: null, categories: ["Card Game"] }, // May not have BGG entry
  { id: 9185, name: "Flotilla", bggId: null, categories: ["Strategy Games"] }, // May not have BGG entry
  { id: 8766, name: "Burger Joint", bggId: null, categories: ["Strategy Games", "Economic"] }, // May not have BGG entry
  { id: 8549, name: "60-Second Slam", bggId: null, categories: ["Party Game"] }, // May not have BGG entry
  { id: 8550, name: "7 Ghosts", bggId: null, categories: ["Card Game"] }, // May not have BGG entry
  { id: 8552, name: "80's 90's Trivia Game", bggId: null, categories: ["Trivia"] }, // May not have BGG entry
  { id: 9270, name: "Goat Lords", bggId: null, categories: ["Card Game"] }, // May not have BGG entry
  { id: 9291, name: "Growl", bggId: null, categories: ["Card Game"] }, // May not have BGG entry
  { id: 8558, name: "A la carte", bggId: null, categories: ["Strategy Games"] }, // May not have BGG entry
  { id: 8717, name: "Blurble", bggId: null, categories: ["Party Game", "Word Game"] }, // May not have BGG entry
];

async function addBggId(gameId, bggId) {
  if (!bggId) return true; // Skip if no BGG ID
  
  const { error } = await supabaseAdmin
    .from('games')
    .update({ bggId: bggId })
    .eq('id', gameId);
  
  if (error) {
    console.error(`  ❌ Error updating BGG ID:`, error);
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
          console.error(`  ❌ Error creating category "${categoryName}":`, insertError);
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
          console.error(`  ❌ Error linking category "${categoryName}":`, linkError);
        }
      }
    }
    return true;
  } catch (error) {
    console.error(`  ❌ Error adding categories: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`🎯 Processing ${gamesData.length} games without BGG ID...\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (let i = 0; i < gamesData.length; i++) {
    const game = gamesData[i];
    console.log(`[${i + 1}/${gamesData.length}] "${game.name}" (ID: ${game.id})`);
    
    // Add BGG ID first if available
    if (game.bggId) {
      console.log(`  📝 Adding BGG ID: ${game.bggId}`);
      const bggSuccess = await addBggId(game.id, game.bggId);
      if (!bggSuccess) {
        console.log(`  ⚠️  Failed to add BGG ID, continuing anyway...`);
      }
    } else {
      console.log(`  ⚠️  No BGG ID found, skipping BGG ID update`);
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


require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Games to process with their categories (will be filled by manual searches)
const gamesToProcess = [
  // Format: { id: 380, name: "Bloodline \"The Family Tree\"", bggId: 96748, categories: [] }
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
  
  console.log(`Found ${games.length} games to process:\n`);
  games.forEach((g, i) => {
    console.log(`${i + 1}. ID: ${g.id}, Name: "${g.nameEn}", BGG ID: ${g.bggId}`);
  });
}

main().catch(console.error);


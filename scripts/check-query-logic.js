require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  // Check specific games
  const testGames = [8554, 9121, 10760]; // Azul, Exploding Kittens, Here to Slay
  
  for (const gameId of testGames) {
    const { data: game } = await supabaseAdmin
      .from('games')
      .select('id, nameEn, bggId')
      .eq('id', gameId)
      .single();
    
    if (game) {
      console.log(`\nGame ID ${gameId}: "${game.nameEn}"`);
      console.log(`  BGG ID: ${game.bggId || 'NULL'}`);
      
      // Check categories
      const { data: categories } = await supabaseAdmin
        .from('game_categories')
        .select('*')
        .eq('gameId', gameId);
      
      console.log(`  Categories: ${categories?.length || 0}`);
      if (categories && categories.length > 0) {
        console.log(`  Category IDs: ${categories.map(c => c.categoryId).join(', ')}`);
      }
      
      // Check if bggId is null
      const isNull = game.bggId === null || game.bggId === undefined;
      console.log(`  BGG ID is null?: ${isNull}`);
    }
  }
  
  // Now try the actual query
  console.log('\n\n=== Testing the query ===');
  
  const { data: allGames } = await supabaseAdmin
    .from('games')
    .select('id, nameEn, bggId');
  
  const { data: gamesWithCats } = await supabaseAdmin
    .from('game_categories')
    .select('gameId');
  
  const gamesWithCatIds = new Set((gamesWithCats || []).map(gc => gc.gameId));
  
  console.log(`Total games: ${allGames?.length || 0}`);
  console.log(`Games with categories: ${gamesWithCatIds.size}`);
  
  const gamesWithoutCats = (allGames || []).filter(g => !gamesWithCatIds.has(g.id));
  console.log(`Games without categories: ${gamesWithoutCats.length}`);
  
  // Check how many have null bggId
  const nullBggId = gamesWithoutCats.filter(g => g.bggId === null || g.bggId === undefined);
  console.log(`Games without categories AND null bggId: ${nullBggId.length}`);
  
  if (nullBggId.length > 0) {
    console.log('\nFirst 25 games:');
    nullBggId.slice(0, 25).forEach(g => {
      console.log(`  ID ${g.id}: "${g.nameEn}"`);
    });
  }
}

main().catch(console.error);


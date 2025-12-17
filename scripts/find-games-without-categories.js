require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  const { data: allGames } = await supabaseAdmin
    .from('games')
    .select('id, nameEn, bggId')
    .not('bggId', 'is', null)
    .limit(200);
  
  const { data: gamesWithCats } = await supabaseAdmin
    .from('game_categories')
    .select('gameId');
  
  const gamesWithCatIds = new Set((gamesWithCats || []).map(gc => gc.gameId));
  const gamesWithoutCats = (allGames || []).filter(g => !gamesWithCatIds.has(g.id));
  
  console.log(`Total games checked: ${allGames?.length || 0}`);
  console.log(`Games without categories: ${gamesWithoutCats.length}`);
  console.log('\nGames without categories:');
  gamesWithoutCats.slice(0, 20).forEach(g => 
    console.log(`  - ${g.nameEn} (ID: ${g.id}, BGG: ${g.bggId})`)
  );
})();


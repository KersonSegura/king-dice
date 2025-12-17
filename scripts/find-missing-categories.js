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
    .order('id', { ascending: true });
  
  const { data: gamesWithCats } = await supabaseAdmin
    .from('game_categories')
    .select('gameId');
  
  const gamesWithCatIds = new Set((gamesWithCats || []).map(gc => gc.gameId));
  const gamesWithoutCats = (allGames || []).filter(g => !gamesWithCatIds.has(g.id));
  
  console.log(`Total games: ${allGames?.length || 0}`);
  console.log(`Games with categories: ${gamesWithCatIds.size}`);
  console.log(`Games without categories: ${gamesWithoutCats.length}\n`);
  
  console.log('Games without categories:');
  gamesWithoutCats.forEach(g => 
    console.log(`  ID: ${g.id}, Name: "${g.nameEn}", BGG ID: ${g.bggId}`)
  );
})();


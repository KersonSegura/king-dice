require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  // Get all games
  const { data: allGames } = await supabaseAdmin
    .from('games')
    .select('id, nameEn, bggId')
    .order('id', { ascending: true });
  
  // Get games with categories
  const { data: gamesWithCats } = await supabaseAdmin
    .from('game_categories')
    .select('gameId');
  
  const gamesWithCatIds = new Set((gamesWithCats || []).map(gc => gc.gameId));
  const gamesWithoutCats = (allGames || []).filter(g => !gamesWithCatIds.has(g.id));
  const gamesWithoutCatsAndBggId = gamesWithoutCats.filter(g => !g.bggId);
  
  console.log(`Found ${gamesWithoutCatsAndBggId.length} games without categories AND without BGG ID:\n`);
  
  gamesWithoutCatsAndBggId.forEach((g, i) => {
    console.log(`${i + 1}. ID: ${g.id}, Name: "${g.nameEn}"`);
  });
  
  // Output as JSON for easy copy-paste
  console.log('\n\nAs JSON array:');
  console.log(JSON.stringify(gamesWithoutCatsAndBggId.map(g => ({ id: g.id, name: g.nameEn })), null, 2));
}

main().catch(console.error);


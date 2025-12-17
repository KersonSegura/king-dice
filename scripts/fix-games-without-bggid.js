require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  // Get all games without categories
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
  
  // Check specific games
  const specificGames = ['Azul', 'Exploding Kittens', 'Here to Slay'];
  for (const name of specificGames) {
    const found = gamesWithoutCatsAndBggId.find(g => g.nameEn.includes(name));
    if (found) {
      console.log(`✅ "${name}" found: ID ${found.id}`);
    } else {
      console.log(`❌ "${name}" NOT in list without BGG ID`);
      // Check if it exists at all
      const exists = allGames.find(g => g.nameEn.includes(name));
      if (exists) {
        console.log(`   But exists: ID ${exists.id}, BGG ID: ${exists.bggId || 'NULL'}, Has categories: ${gamesWithCatIds.has(exists.id)}`);
      }
    }
  }
  
  console.log(`\n\nAll ${gamesWithoutCatsAndBggId.length} games:\n`);
  gamesWithoutCatsAndBggId.forEach((g, i) => {
    console.log(`${i + 1}. ID: ${g.id}, Name: "${g.nameEn}"`);
  });
}

main().catch(console.error);


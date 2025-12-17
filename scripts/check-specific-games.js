require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function checkGame(gameName) {
  console.log(`\n🔍 Checking: "${gameName}"`);
  
  // Find the game
  const { data: games, error: gameError } = await supabaseAdmin
    .from('games')
    .select('id, nameEn, bggId')
    .ilike('nameEn', `%${gameName}%`);
  
  if (gameError) {
    console.error(`  ❌ Error finding game:`, gameError);
    return;
  }
  
  if (!games || games.length === 0) {
    console.log(`  ⚠️  Game not found in database`);
    return;
  }
  
  for (const game of games) {
    console.log(`  📋 Found: ID ${game.id}, Name: "${game.nameEn}", BGG ID: ${game.bggId || 'NULL'}`);
    
    // Check if it has categories
    const { data: categories, error: catError } = await supabaseAdmin
      .from('game_categories')
      .select('categoryId, category:categories(nameEn)')
      .eq('gameId', game.id);
    
    if (catError) {
      console.error(`  ❌ Error checking categories:`, catError);
      continue;
    }
    
    if (!categories || categories.length === 0) {
      console.log(`  ⚠️  NO CATEGORIES`);
      if (!game.bggId) {
        console.log(`  ⚠️  Also has no BGG ID, so it was skipped by the script!`);
      } else {
        console.log(`  ❓ Has BGG ID (${game.bggId}) but wasn't in the first 24 games checked`);
      }
    } else {
      const categoryNames = categories.map(c => c.category?.nameEn || 'Unknown').join(', ');
      console.log(`  ✅ Has ${categories.length} categories: ${categoryNames}`);
    }
  }
}

async function main() {
  console.log('Checking specific games...\n');
  
  await checkGame('Azul');
  await checkGame('Exploding Kittens');
  await checkGame('Here to Slay');
  
  console.log('\n\n🔍 Now checking: How many games total are missing categories?');
  
  // Get all games
  const { data: allGames } = await supabaseAdmin
    .from('games')
    .select('id, nameEn, bggId');
  
  // Get games with categories
  const { data: gamesWithCats } = await supabaseAdmin
    .from('game_categories')
    .select('gameId');
  
  const gamesWithCatIds = new Set((gamesWithCats || []).map(gc => gc.gameId));
  
  const gamesWithoutCats = (allGames || []).filter(g => !gamesWithCatIds.has(g.id));
  const gamesWithoutCatsAndBggId = gamesWithoutCats.filter(g => !g.bggId);
  const gamesWithoutCatsButWithBggId = gamesWithoutCats.filter(g => g.bggId);
  
  console.log(`\n📊 Total games in database: ${allGames?.length || 0}`);
  console.log(`📊 Games WITHOUT categories: ${gamesWithoutCats.length}`);
  console.log(`   - Without BGG ID: ${gamesWithoutCatsAndBggId.length}`);
  console.log(`   - With BGG ID: ${gamesWithoutCatsButWithBggId.length}`);
  
  if (gamesWithoutCatsButWithBggId.length > 0) {
    console.log(`\n📋 First 10 games without categories BUT with BGG ID:`);
    gamesWithoutCatsButWithBggId.slice(0, 10).forEach(g => {
      console.log(`   - "${g.nameEn}" (ID: ${g.id}, BGG: ${g.bggId})`);
    });
  }
}

main().catch(console.error);


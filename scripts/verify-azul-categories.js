require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  const gameId = 8554; // Azul
  
  console.log(`Checking Azul (ID: ${gameId})...\n`);
  
  // Check game
  const { data: game } = await supabaseAdmin
    .from('games')
    .select('id, nameEn, bggId')
    .eq('id', gameId)
    .single();
  
  console.log(`Game: ${game?.nameEn}`);
  console.log(`BGG ID: ${game?.bggId || 'NULL'}\n`);
  
  // Check categories directly
  const { data: gameCategories, error } = await supabaseAdmin
    .from('game_categories')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('gameId', gameId);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${gameCategories?.length || 0} categories:\n`);
  
  if (gameCategories && gameCategories.length > 0) {
    gameCategories.forEach((gc) => {
      const cat = Array.isArray(gc.category) ? gc.category[0] : gc.category;
      console.log(`  - ${cat?.nameEn || 'Unknown'} (Category ID: ${cat?.id}, Link ID: ${gc.id})`);
    });
  } else {
    console.log('  ⚠️  No categories found!');
    
    // Check if categories exist in the categories table
    const { data: allCategories } = await supabaseAdmin
      .from('categories')
      .select('*')
      .ilike('nameEn', '%abstract%')
      .limit(5);
    
    console.log(`\nSample categories with "Abstract": ${allCategories?.length || 0}`);
    if (allCategories && allCategories.length > 0) {
      allCategories.forEach(c => console.log(`  - ${c.nameEn} (ID: ${c.id})`));
    }
  }
  
  // Test the exact query the API uses
  console.log('\n\n=== Testing API query ===');
  const { data: apiTest } = await supabaseAdmin
    .from('game_categories')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('gameId', gameId);
  
  console.log(`API query result: ${apiTest?.length || 0} items`);
  if (apiTest && apiTest.length > 0) {
    apiTest.forEach((item) => {
      console.log(JSON.stringify(item, null, 2));
    });
  }
}

main().catch(console.error);


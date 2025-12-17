require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  const gameId = 8554; // Azul
  const categories = ["Abstract Strategy", "Tile Placement", "Pattern Building"];
  
  console.log(`Adding categories to Azul (ID: ${gameId})...\n`);
  
  // First, let's see what's in the table
  const { data: existing } = await supabaseAdmin
    .from('game_categories')
    .select('*')
    .eq('gameId', gameId);
  
  console.log(`Currently has ${existing?.length || 0} categories linked`);
  
  // Get or create categories
  const categoryIds = [];
  for (const categoryName of categories) {
    let { data: cat } = await supabaseAdmin
      .from('categories')
      .select('id')
      .ilike('nameEn', categoryName)
      .limit(1)
      .single();
    
    if (!cat) {
      const { data: newCat } = await supabaseAdmin
        .from('categories')
        .insert({ nameEn: categoryName, nameEs: categoryName })
        .select('id')
        .single();
      cat = newCat;
    }
    
    if (cat && cat.id) {
      categoryIds.push(cat.id);
      console.log(`✅ Category "${categoryName}": ID ${cat.id}`);
    }
  }
  
  // Delete existing for this game
  const { error: deleteError } = await supabaseAdmin
    .from('game_categories')
    .delete()
    .eq('gameId', gameId);
  
  if (deleteError) {
    console.error('Delete error:', deleteError);
  } else {
    console.log(`\n✅ Deleted existing links`);
  }
  
  // Insert all at once
  const inserts = categoryIds.map(categoryId => ({
    gameId: gameId,
    categoryId: categoryId
  }));
  
  console.log(`\nInserting ${inserts.length} links...`);
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('game_categories')
    .insert(inserts)
    .select();
  
  if (insertError) {
    console.error('Insert error:', insertError);
    
    // Try inserting one by one
    console.log('\nTrying one by one...');
    for (const insert of inserts) {
      const { error: singleError } = await supabaseAdmin
        .from('game_categories')
        .insert(insert);
      
      if (singleError) {
        console.error(`Error inserting ${insert.categoryId}:`, singleError);
      } else {
        console.log(`✅ Inserted category ${insert.categoryId}`);
      }
    }
  } else {
    console.log(`✅ Successfully inserted ${inserted?.length || 0} links`);
  }
  
  // Verify
  const { data: verify } = await supabaseAdmin
    .from('game_categories')
    .select(`
      *,
      category:categories(nameEn)
    `)
    .eq('gameId', gameId);
  
  console.log(`\n✅ Final verification: ${verify?.length || 0} categories`);
  verify?.forEach(gc => {
    const cat = Array.isArray(gc.category) ? gc.category[0] : gc.category;
    console.log(`  - ${cat?.nameEn}`);
  });
}

main().catch(console.error);


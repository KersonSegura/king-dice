require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function addCategoriesToGame(gameId, categories) {
  try {
    console.log(`\nAdding categories to game ${gameId}...`);
    
    // Delete existing first
    const { error: deleteError } = await supabaseAdmin
      .from('game_categories')
      .delete()
      .eq('gameId', gameId);
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
    } else {
      console.log('  ✅ Deleted existing categories');
    }
    
    // Add new categories
    for (const categoryName of categories) {
      console.log(`  Processing category: "${categoryName}"`);
      
      // Find or create category
      let { data: existing, error: findError } = await supabaseAdmin
        .from('categories')
        .select('*')
        .ilike('nameEn', categoryName)
        .limit(1);
      
      if (findError) {
        console.error(`    Error finding category:`, findError);
        continue;
      }
      
      let categoryId;
      if (!existing || existing.length === 0) {
        console.log(`    Creating new category: "${categoryName}"`);
        const { data: newCat, error: insertError } = await supabaseAdmin
          .from('categories')
          .insert({ nameEn: categoryName, nameEs: categoryName })
          .select()
          .single();
        
        if (insertError) {
          console.error(`    Error creating category:`, insertError);
          continue;
        }
        categoryId = newCat.id;
        console.log(`    ✅ Created category with ID: ${categoryId}`);
      } else {
        categoryId = existing[0].id;
        console.log(`    ✅ Found existing category with ID: ${categoryId}`);
      }
      
      // Check if link already exists
      const { data: existingLink } = await supabaseAdmin
        .from('game_categories')
        .select('id')
        .eq('gameId', gameId)
        .eq('categoryId', categoryId)
        .limit(1);
      
      if (existingLink && existingLink.length > 0) {
        console.log(`    ⚠️  Link already exists, skipping`);
        continue;
      }
      
      // Insert the link
      const { error: linkError } = await supabaseAdmin
        .from('game_categories')
        .insert({
          gameId: gameId,
          categoryId: categoryId
        });
      
      if (linkError) {
        console.error(`    ❌ Error linking category:`, linkError);
      } else {
        console.log(`    ✅ Linked category successfully!`);
      }
    }
    
    // Verify
    const { data: verify } = await supabaseAdmin
      .from('game_categories')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('gameId', gameId);
    
    console.log(`\n✅ Verification: Found ${verify?.length || 0} categories linked`);
    if (verify && verify.length > 0) {
      verify.forEach((gc) => {
        const cat = Array.isArray(gc.category) ? gc.category[0] : gc.category;
        console.log(`  - ${cat?.nameEn}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error(`Error:`, error);
    return false;
  }
}

async function main() {
  const gameId = 8554; // Azul
  const categories = ["Abstract Strategy", "Tile Placement", "Pattern Building"];
  
  await addCategoriesToGame(gameId, categories);
}

main().catch(console.error);


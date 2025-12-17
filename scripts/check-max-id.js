require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  // Get the max ID
  const { data: all } = await supabaseAdmin
    .from('game_categories')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);
  
  const maxId = all && all.length > 0 ? all[0].id : 0;
  console.log(`Max ID in game_categories: ${maxId}`);
  
  // Try to insert with an explicit ID that's way higher
  const gameId = 8554;
  const categoryId = 38; // Abstract Strategy
  
  // Try using RPC to reset sequence or insert directly
  // Actually, let's just try a really high ID manually
  console.log(`\nTrying to insert with explicit high ID...`);
  
  // We can't easily set the ID with Supabase client if it's auto-increment
  // Let's try a workaround: check if there's a way to do this
  
  // Actually, the best solution is to run SQL to reset the sequence
  // But for now, let's see if we can use the Supabase SQL editor approach
  
  console.log('\n⚠️  The sequence is out of sync. You need to run this SQL in Supabase:');
  console.log(`
SELECT setval(pg_get_serial_sequence('game_categories', 'id'), (SELECT MAX(id) FROM game_categories));
  `);
  
  // For now, let's try to insert and see what happens with the actual error
  // Actually wait - maybe the issue is that IDs 111-114 are used by soft-deleted rows?
  // Let's check what's at those IDs
  for (let id = 108; id <= 115; id++) {
    const { data: check } = await supabaseAdmin
      .from('game_categories')
      .select('*')
      .eq('id', id);
    
    if (check && check.length > 0) {
      console.log(`ID ${id} exists:`, check[0]);
    }
  }
}

main().catch(console.error);


require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStructure() {
  console.log('Checking game_rules table structure...\n');
  
  // Try to get a sample rule to see column names
  const { data: sample, error: sampleError } = await supabase
    .from('game_rules')
    .select('*')
    .limit(1);
  
  if (sampleError) {
    console.error('Error fetching sample:', sampleError);
    // Try camelCase table name
    const { data: sample2, error: sampleError2 } = await supabase
      .from('gameRule')
      .select('*')
      .limit(1);
    
    if (sampleError2) {
      console.error('Error with gameRule table:', sampleError2);
      return;
    }
    console.log('Found gameRule table (camelCase):');
    console.log('Sample row keys:', Object.keys(sample2[0] || {}));
    console.log('Sample data:', JSON.stringify(sample2[0], null, 2));
    return;
  }
  
  console.log('Found game_rules table (snake_case):');
  console.log('Sample row keys:', Object.keys(sample[0] || {}));
  console.log('Sample data:', JSON.stringify(sample[0], null, 2));
  
  // Check for Catan (usually game ID 13 or find by name)
  console.log('\nChecking for Catan rules...');
  const { data: catanByGameId, error: idError } = await supabase
    .from('game_rules')
    .select('*')
    .eq('game_id', 13);
  
  if (!idError && catanByGameId && catanByGameId.length > 0) {
    console.log('Found rules with game_id = 13:', catanByGameId.length);
    console.log('Sample:', JSON.stringify(catanByGameId[0], null, 2));
  } else {
    console.log('No rules found with game_id = 13, error:', idError);
    
    // Try camelCase
    const { data: catanByGameIdCamel, error: idErrorCamel } = await supabase
      .from('game_rules')
      .select('*')
      .eq('gameId', 13);
    
    if (!idErrorCamel && catanByGameIdCamel && catanByGameIdCamel.length > 0) {
      console.log('Found rules with gameId = 13:', catanByGameIdCamel.length);
      console.log('Sample:', JSON.stringify(catanByGameIdCamel[0], null, 2));
    } else {
      console.log('No rules found with gameId = 13 either');
    }
  }
  
  // Get total count
  const { count } = await supabase
    .from('game_rules')
    .select('*', { count: 'exact', head: true });
  
  console.log('\nTotal rules in database:', count);
}

checkStructure().catch(console.error);


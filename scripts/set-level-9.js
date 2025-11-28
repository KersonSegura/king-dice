/**
 * Script to set a user to level 9
 * Usage: node scripts/set-level-9.js [username]
 * If no username is provided, defaults to "kingdice"
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Level definitions
const LEVELS = [
  { level: 1, name: 'Commoner', xpRequired: 0 },
  { level: 2, name: 'Squire', xpRequired: 100 },
  { level: 3, name: 'Knight', xpRequired: 250 },
  { level: 4, name: 'Champion', xpRequired: 500 },
  { level: 5, name: 'Baron/Baroness', xpRequired: 900 },
  { level: 6, name: 'Lord/Lady', xpRequired: 1400 },
  { level: 7, name: 'Archmage', xpRequired: 2000 },
  { level: 8, name: 'Duke/Duchess', xpRequired: 2800 },
  { level: 9, name: 'Prince', xpRequired: 4000 },
  { level: 10, name: 'King/Queen', xpRequired: 6000 }
];

async function setUserToLevel(username, targetLevel = 9) {
  try {
    console.log(`🔍 Looking for user: ${username}`);
    
    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .single();

    if (userError || !user) {
      console.error(`❌ User not found: ${username}`);
      console.error('Error:', userError);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.username} (ID: ${user.id})`);

    // Get level definition
    const levelDef = LEVELS.find(l => l.level === targetLevel);
    if (!levelDef) {
      console.error(`❌ Invalid level: ${targetLevel}`);
      process.exit(1);
    }

    console.log(`📊 Setting to Level ${targetLevel} (${levelDef.name}) - ${levelDef.xpRequired} XP required`);

    // Update users table
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        level: targetLevel,
        xp: levelDef.xpRequired
      })
      .eq('id', user.id);

    if (updateUserError) {
      console.error('❌ Error updating users table:', updateUserError);
      process.exit(1);
    }

    console.log('✅ Updated users table');

    // Update or create user_xp table entry
    const { error: upsertError } = await supabase
      .from('user_xp')
      .upsert({
        user_id: user.id,
        username: user.username,
        xp: levelDef.xpRequired,
        level: targetLevel,
        level_name: levelDef.name
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('❌ Error updating user_xp table:', upsertError);
      process.exit(1);
    }

    console.log('✅ Updated user_xp table');
    console.log(`\n🎉 Successfully set ${username} to Level ${targetLevel} (${levelDef.name})!`);
    console.log(`   XP: ${levelDef.xpRequired}`);
    console.log(`   Level: ${targetLevel}`);
    console.log(`   Level Name: ${levelDef.name}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Get username from command line argument or default to "kingdice"
const username = process.argv[2] || 'kingdice';
const targetLevel = parseInt(process.argv[3]) || 9;

console.log(`🚀 Setting user "${username}" to level ${targetLevel}...\n`);
setUserToLevel(username, targetLevel);


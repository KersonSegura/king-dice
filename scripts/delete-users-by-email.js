/**
 * Script to delete users by email address
 * Usage: node scripts/delete-users-by-email.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

async function deleteUserByEmail(email) {
  console.log(`\n🔍 Looking for user with email: ${email}`);
  
  // Find user by email (case-insensitive)
  const { data: users, error: findError } = await supabaseAdmin
    .from('users')
    .select('id, username, email')
    .ilike('email', email)
    .limit(1);

  if (findError) {
    console.error(`❌ Error finding user:`, findError);
    return { success: false, error: findError };
  }

  if (!users || users.length === 0) {
    console.log(`⚠️  User not found with email: ${email}`);
    return { success: false, error: 'User not found' };
  }

  const user = users[0];
  const userId = user.id;
  console.log(`✅ Found user: ${user.username} (ID: ${userId})`);
  console.log(`🗑️  Starting deletion process...`);

  try {
    // Delete related data in order (respecting foreign key constraints)
    // 1. Delete verification codes (try both column name variations)
    console.log('   Deleting verification codes...');
    await supabaseAdmin
      .from('two_factor_codes')
      .delete()
      .eq('userId', userId);
    
    await supabaseAdmin
      .from('two_factor_codes')
      .delete()
      .eq('user_id', userId);

    // 2. Delete follows (both as follower and following)
    console.log('   Deleting follows...');
    await supabaseAdmin
      .from('follows')
      .delete()
      .eq('followerId', userId);
    
    await supabaseAdmin
      .from('follows')
      .delete()
      .eq('followingId', userId);

    // 3. Delete gallery images
    console.log('   Deleting gallery images...');
    const { data: userImages } = await supabaseAdmin
      .from('gallery')
      .select('id, imageUrl')
      .eq('userId', userId);

    if (userImages && userImages.length > 0) {
      await supabaseAdmin
        .from('gallery')
        .delete()
        .eq('userId', userId);
      console.log(`   Deleted ${userImages.length} gallery image(s)`);
    }

    // 4. Delete forum posts
    console.log('   Deleting forum posts...');
    const { data: posts } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('authorId', userId);
    
    if (posts && posts.length > 0) {
      await supabaseAdmin
        .from('posts')
        .delete()
        .eq('authorId', userId);
      console.log(`   Deleted ${posts.length} post(s)`);
    }

    // 5. Delete comments
    console.log('   Deleting comments...');
    try {
      const { data: comments } = await supabaseAdmin
        .from('comments')
        .select('id')
        .eq('userId', userId);
      
      if (comments && comments.length > 0) {
        await supabaseAdmin
          .from('comments')
          .delete()
          .eq('userId', userId);
        console.log(`   Deleted ${comments.length} comment(s)`);
      }
    } catch (error) {
      console.log('   Comments table may not exist or use different column name');
    }

    // 6. Delete messages (both sent and received)
    console.log('   Deleting messages...');
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('senderId', userId);
    
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('receiverId', userId);

    // 7. Delete chats
    console.log('   Deleting chats...');
    await supabaseAdmin
      .from('chats')
      .delete()
      .eq('user1Id', userId);
    
    await supabaseAdmin
      .from('chats')
      .delete()
      .eq('user2Id', userId);

    // 8. Delete user games collection
    console.log('   Deleting user games...');
    try {
      await supabaseAdmin
        .from('user_games')
        .delete()
        .eq('userId', userId);
    } catch (error) {
      console.log('   user_games table may not exist');
    }

    // 9. Delete user XP records
    console.log('   Deleting user XP records...');
    try {
      await supabaseAdmin
        .from('user_xp')
        .delete()
        .eq('user_id', userId);
    } catch (error) {
      console.log('   user_xp table may not exist');
    }

    // 10. Delete votes/nominations
    console.log('   Deleting votes/nominations...');
    try {
      await supabaseAdmin
        .from('catan_nominations_votes')
        .delete()
        .eq('userId', userId);
    } catch (error) {
      console.log('   Votes table may not exist');
    }

    // 11. Delete game suggestions linked to user
    console.log('   Deleting game suggestions...');
    try {
      await supabaseAdmin
        .from('game_suggestions')
        .delete()
        .eq('user_id', userId);
    } catch (error) {
      console.log('   game_suggestions table may not exist');
    }

    // 12. Delete pending registrations
    console.log('   Deleting pending registrations...');
    try {
      await supabaseAdmin
        .from('pending_registrations')
        .delete()
        .eq('email', email);
    } catch (error) {
      console.log('   pending_registrations table may not exist');
    }

    // 13. Finally, delete the user
    console.log('   Deleting user record...');
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error(`❌ Error deleting user:`, deleteError);
      return { success: false, error: deleteError };
    }

    console.log(`✅ Successfully deleted user: ${user.username} (${email})`);
    return { success: true, user };

  } catch (error) {
    console.error(`❌ Error during deletion process:`, error);
    return { success: false, error };
  }
}

async function main() {
  const emails = [
    'kerson_7@hotmail.com'
  ];

  console.log('🚀 Starting user deletion process...');
  console.log(`📧 Will delete ${emails.length} user(s)`);

  const results = [];

  for (const email of emails) {
    const result = await deleteUserByEmail(email);
    results.push({ email, ...result });
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Deletion Summary:');
  console.log('='.repeat(50));

  results.forEach(({ email, success, user, error }) => {
    if (success) {
      console.log(`✅ ${email} - DELETED (${user?.username || 'N/A'})`);
    } else {
      console.log(`❌ ${email} - FAILED: ${error?.message || error || 'Unknown error'}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully deleted: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(50));

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


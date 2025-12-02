import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    // Get authentication token from cookies
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user from token
    const authResult = await getUserFromToken(token);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;
    console.log(`🗑️ Starting account deletion for user: ${userId}`);

    // Delete related data in order (respecting foreign key constraints)
    // 1. Delete verification codes (try both column name variations)
    await supabaseAdmin
      .from('two_factor_codes')
      .delete()
      .eq('userId', userId);
    
    await supabaseAdmin
      .from('two_factor_codes')
      .delete()
      .eq('user_id', userId);

    // 2. Delete follows (both as follower and following)
    await supabaseAdmin
      .from('follows')
      .delete()
      .eq('followerId', userId);
    
    await supabaseAdmin
      .from('follows')
      .delete()
      .eq('followingId', userId);

    // 3. Delete gallery images (if they exist)
    const { data: userImages } = await supabaseAdmin
      .from('gallery')
      .select('id, imageUrl')
      .eq('userId', userId);

    if (userImages && userImages.length > 0) {
      // Delete from gallery table
      await supabaseAdmin
        .from('gallery')
        .delete()
        .eq('userId', userId);
      
      // Note: Image files in Supabase Storage would need to be deleted separately
      // if you want to clean up storage as well
    }

    // 4. Delete forum posts
    await supabaseAdmin
      .from('posts')
      .delete()
      .eq('authorId', userId);

    // 5. Delete comments (if comments table exists)
    try {
      await supabaseAdmin
        .from('comments')
        .delete()
        .eq('userId', userId);
    } catch (error) {
      console.log('Comments table may not exist or use different column name');
    }

    // 6. Delete messages (both sent and received)
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('senderId', userId);
    
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('receiverId', userId);

    // 7. Delete chats
    await supabaseAdmin
      .from('chats')
      .delete()
      .eq('user1Id', userId);
    
    await supabaseAdmin
      .from('chats')
      .delete()
      .eq('user2Id', userId);

    // 8. Delete user games collection
    try {
      await supabaseAdmin
        .from('user_games')
        .delete()
        .eq('userId', userId);
    } catch (error) {
      console.log('user_games table may not exist or use different column name');
    }

    // 9. Delete user XP records
    try {
      await supabaseAdmin
        .from('user_xp')
        .delete()
        .eq('user_id', userId);
    } catch (error) {
      console.log('user_xp table may not exist or use different column name');
    }

    // 10. Delete votes/nominations (if they exist)
    try {
      await supabaseAdmin
        .from('catan_nominations_votes')
        .delete()
        .eq('userId', userId);
    } catch (error) {
      console.log('Votes table may not exist');
    }

    // 11. Finally, delete the user
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully deleted account for user: ${userId}`);

    // Clear the authentication cookie
    const response = NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });

    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('❌ Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account', details: error.message },
      { status: 500 }
    );
  }
}


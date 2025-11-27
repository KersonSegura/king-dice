import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';


// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get follow relationships
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'following' or 'followers'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (type === 'following') {
      // Get users that this user is following
      // Query follows table and then get user details separately
      const { data: following, error } = await supabaseAdmin
        .from('follows')
        .select('followingId, createdAt')
        .eq('followerId', userId);

      if (error) {
        console.error('Error fetching following:', error);
        return NextResponse.json({
          success: true,
          users: [],
          following: [],
          count: 0
        });
      }

      // Get user details for each following ID
      const followingIds = (following || []).map((f: any) => f.followingId).filter(Boolean);
      let users: any[] = [];
      
      if (followingIds.length > 0) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, username, avatar, isVerified, isAdmin')
          .in('id', followingIds);
        
        if (!userError && userData) {
          // Map users with their follow dates
          const followMap = new Map((following || []).map((f: any) => [f.followingId, f.createdAt]));
          users = userData.map((u: any) => ({
            id: u.id,
            username: u.username || '',
            avatar: u.avatar || '',
            isVerified: u.isVerified || false,
            isAdmin: u.isAdmin || false,
            followedAt: followMap.get(u.id)
          }));
        }
      }

      return NextResponse.json({
        success: true,
        users: users,
        following: following || [],
        count: users.length
      });
    } else if (type === 'followers') {
      // Get users that follow this user
      const { data: followers, error } = await supabaseAdmin
        .from('follows')
        .select('followerId, createdAt')
        .eq('followingId', userId);

      if (error) {
        console.error('Error fetching followers:', error);
        return NextResponse.json({
          success: true,
          users: [],
          followers: [],
          count: 0
        });
      }

      // Get user details for each follower ID
      const followerIds = (followers || []).map((f: any) => f.followerId).filter(Boolean);
      let users: any[] = [];
      
      if (followerIds.length > 0) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, username, avatar, isVerified, isAdmin')
          .in('id', followerIds);
        
        if (!userError && userData) {
          // Map users with their follow dates
          const followMap = new Map((followers || []).map((f: any) => [f.followerId, f.createdAt]));
          users = userData.map((u: any) => ({
            id: u.id,
            username: u.username || '',
            avatar: u.avatar || '',
            isVerified: u.isVerified || false,
            isAdmin: u.isAdmin || false,
            followedAt: followMap.get(u.id)
          }));
        }
      }

      return NextResponse.json({
        success: true,
        users: users,
        followers: followers || [],
        count: users.length
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Use "following" or "followers"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in GET follow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUserId } = body;
    const userId = request.headers.get('user-id'); // This would come from auth middleware

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Check if already following
    const { data: existingFollow, error: existingErr } = await supabaseAdmin
      .from('follows')
      .select('id')
      .eq('followerId', userId)
      .eq('followingId', targetUserId)
      .maybeSingle();

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following this user' },
        { status: 400 }
      );
    }

    // Create follow relationship
    const { error: createErr } = await supabaseAdmin
      .from('follows')
      .insert({ followerId: userId, followingId: targetUserId });
    if (createErr) {
      console.error('Error creating follow:', createErr);
      return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 });
    }

    // Create notification for the target user
    await createNotification({
      userId: targetUserId,
      type: 'follow',
      actorId: userId,
      entityType: 'profile',
      entityId: userId,
      url: `/profile/${userId}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully followed user'
    });

  } catch (error) {
    console.error('Error following user:', error);
    return NextResponse.json(
      { error: 'Failed to follow user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('targetUserId');
    const userId = request.headers.get('user-id'); // This would come from auth middleware

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    // Remove follow relationship
    const { error: delErr } = await supabaseAdmin
      .from('follows')
      .delete()
      .eq('followerId', userId)
      .eq('followingId', targetUserId);
    if (delErr) {
      console.error('Error unfollowing:', delErr);
      return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed user'
    });

  } catch (error) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 }
    );
  }
}
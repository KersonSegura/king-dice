import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get follow relationships
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'following', 'followers', or 'status'
    const followerId = searchParams.get('followerId');
    const followingId = searchParams.get('followingId');

    // Check if this is a status check (is one user following another?)
    if (followerId && followingId) {
      try {
        const { data: follow, error } = await supabaseAdmin
          .from('follows')
          .select('id')
          .eq('followerId', followerId)
          .eq('followingId', followingId)
          .maybeSingle();

        if (error) {
          console.error('Error checking follow status:', error);
          return NextResponse.json({ isFollowing: false }, { status: 200 });
        }

        return NextResponse.json({
          isFollowing: !!follow
        });
      } catch (error) {
        console.error('Error checking follow status:', error);
        return NextResponse.json({ isFollowing: false }, { status: 200 });
      }
    }

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
    // Get current user from authentication token
    let currentUserId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
      if (token) {
        const authResult = await getUserFromToken(token);
        if (authResult.success && authResult.user) {
          currentUserId = authResult.user.id;
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, followerId, followingId, targetUserId } = body;
    
    // Support both old (targetUserId) and new (followingId/followerId) formats
    const targetUser = followingId || targetUserId;
    const followerUser = followerId || currentUserId;

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    // Ensure the authenticated user is the one making the request
    if (followerUser !== currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only modify your own follow relationships' },
        { status: 403 }
      );
    }

    if (currentUserId === targetUser) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Handle different actions
    if (action === 'follow') {
      // Check if already following
      const { data: existingFollow, error: existingErr } = await supabaseAdmin
        .from('follows')
        .select('id')
        .eq('followerId', currentUserId)
        .eq('followingId', targetUser)
        .maybeSingle();

      if (existingFollow) {
        return NextResponse.json({
          success: true,
          message: 'Already following this user'
        });
      }

      // Create follow relationship
      const { error: createErr } = await supabaseAdmin
        .from('follows')
        .insert({ followerId: currentUserId, followingId: targetUser });
      
      if (createErr) {
        console.error('Error creating follow:', createErr);
        return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 });
      }

      // Create notification for the target user
      try {
        // Fetch the follower's username for the notification URL
        const { data: followerUser, error: userError } = await supabaseAdmin
          .from('users')
          .select('username')
          .eq('id', currentUserId)
          .single();
        
        const profileUrl = followerUser?.username 
          ? `/profile/${followerUser.username}`
          : `/profile/${currentUserId}`;
        
        await createNotification({
          userId: targetUser,
          type: 'follow',
          actorId: currentUserId,
          entityType: 'profile',
          entityId: currentUserId,
          url: profileUrl,
        });
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the request if notification fails
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully followed user'
      });

    } else if (action === 'unfollow') {
      // Remove follow relationship
      const { error: deleteErr } = await supabaseAdmin
        .from('follows')
        .delete()
        .eq('followerId', currentUserId)
        .eq('followingId', targetUser);
      
      if (deleteErr) {
        console.error('Error unfollowing:', deleteErr);
        return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully unfollowed user'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "follow" or "unfollow"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in follow API:', error);
    return NextResponse.json(
      { error: 'Failed to process follow request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get current user from authentication token
    let currentUserId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
      if (token) {
        const authResult = await getUserFromToken(token);
        if (authResult.success && authResult.user) {
          currentUserId = authResult.user.id;
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('targetUserId');

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
      .eq('followerId', currentUserId)
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
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';


// Force dynamic rendering
export const dynamic = 'force-dynamic';
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
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
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
      .insert({ follower_id: userId, following_id: targetUserId });
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
      .eq('follower_id', userId)
      .eq('following_id', targetUserId);
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
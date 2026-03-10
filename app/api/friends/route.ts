import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';
import { emailService } from '@/lib/email-service';

// GET - Get user's friends list

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'accepted'; // pending, accepted, blocked

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: friendships, error: fetchErr } = await supabaseAdmin
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        user:users!friendships_user_id_fkey (id, username, avatar, is_verified, is_admin),
        friend:users!friendships_friend_id_fkey (id, username, avatar, is_verified, is_admin)
      `)
      .or(`and(user_id.eq.${userId},status.eq.${status}),and(friend_id.eq.${userId},status.eq.${status})`)
      .order('created_at', { ascending: false });
    if (fetchErr) {
      console.error('Error fetching friends:', fetchErr);
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
    }

    // Transform the data to always show the other user
    const friends = (friendships || []).map((friendship: any) => {
      const isUser = friendship.user_id === userId;
      const otherUser = isUser ? friendship.friend : friendship.user;
      return {
        id: friendship.id,
        user: {
          id: otherUser?.id || '',
          username: otherUser?.username || '',
          avatar: otherUser?.avatar || '',
          isVerified: otherUser?.is_verified || false,
          isAdmin: otherUser?.is_admin || false
        },
        status: friendship.status,
        createdAt: friendship.created_at
      };
    });

    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}

// POST - Send friend request or accept/decline/block (requires auth for mutate actions)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId: bodyUserId, friendId } = body;

    // For mutate actions, require auth and use authenticated user as userId
    const mutateActions = ['send_request', 'accept', 'decline', 'unfriend', 'block'];
    let userId = bodyUserId;
    if (mutateActions.includes(action)) {
      const token = request.cookies.get('auth_token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const authResult = await getUserFromToken(token);
      if (!authResult.success || !authResult.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = authResult.user.id;
    }

    if (!userId || !friendId) {
      return NextResponse.json({ error: 'User ID and Friend ID are required' }, { status: 400 });
    }

    if (userId === friendId) {
      return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 });
    }

    switch (action) {
      case 'send_request': {
        // Check if friendship already exists
        const { data: existingFriendship, error: exErr } = await supabaseAdmin
          .from('friendships')
          .select('id')
          .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
          .maybeSingle();

        if (existingFriendship) {
          return NextResponse.json({ error: 'Friendship already exists' }, { status: 400 });
        }

        const { data: created, error: createErr } = await supabaseAdmin
          .from('friendships')
          .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
          .select(`id, status, created_at, friend:users!friendships_friend_id_fkey (id, username, avatar, is_verified, is_admin)`) 
          .single();
        if (createErr) {
          console.error('Error creating friendship:', createErr);
          return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          friendship: {
            id: created.id,
            user: created.friend,
            status: created.status,
            createdAt: created.created_at
          }
        });
      }

      case 'accept': {
        const { data: friendship, error: findErr } = await supabaseAdmin
          .from('friendships')
          .select('id')
          .eq('user_id', friendId)
          .eq('friend_id', userId)
          .eq('status', 'pending')
          .single();

        if (!friendship) {
          return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
        }

        const { error: updErr } = await supabaseAdmin
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendship.id);
        if (updErr) return NextResponse.json({ error: 'Failed to accept' }, { status: 500 });

        return NextResponse.json({ success: true });
      }

      case 'decline': {
        const { data: friendship, error: findErr } = await supabaseAdmin
          .from('friendships')
          .select('id')
          .eq('user_id', friendId)
          .eq('friend_id', userId)
          .eq('status', 'pending')
          .single();

        if (!friendship) {
          return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
        }

        const { error: delErr } = await supabaseAdmin
          .from('friendships')
          .delete()
          .eq('id', friendship.id);
        if (delErr) return NextResponse.json({ error: 'Failed to decline' }, { status: 500 });

        return NextResponse.json({ success: true });
      }

      case 'unfriend': {
        const { data: friendship, error: findErr } = await supabaseAdmin
          .from('friendships')
          .select('id')
          .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!friendship) {
          return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
        }

        const { error: delErr2 } = await supabaseAdmin
          .from('friendships')
          .delete()
          .eq('id', friendship.id);
        if (delErr2) return NextResponse.json({ error: 'Failed to unfriend' }, { status: 500 });

        return NextResponse.json({ success: true });
      }

      case 'block': {
        // Remove existing friendship if any
        await supabaseAdmin
          .from('friendships')
          .delete()
          .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

        // Create blocked relationship
        const { error: blockErr } = await supabaseAdmin
          .from('friendships')
          .insert({ user_id: userId, friend_id: friendId, status: 'blocked' });
        if (blockErr) return NextResponse.json({ error: 'Failed to block' }, { status: 500 });

        // Notify developer (Guideline 1.2: blocking should notify developer of inappropriate content)
        try {
          const { data: blocker } = await supabaseAdmin.from('users').select('username').eq('id', userId).single();
          const { data: blocked } = await supabaseAdmin.from('users').select('username').eq('id', friendId).single();
          const blockerName = (blocker as any)?.username || userId;
          const blockedName = (blocked as any)?.username || friendId;
          const supportEmail = process.env.SUPPORT_EMAIL || 'support@kingdice.gg';
          const text = `User "${blockerName}" (${userId}) blocked user "${blockedName}" (${friendId}). Their content is now hidden from the blocker's feed. Consider reviewing for inappropriate content.`;
          await emailService.sendEmail({
            to: supportEmail,
            subject: `[King Dice] User block: ${blockerName} blocked ${blockedName}`,
            html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
            text,
          });
        } catch (e) {
          console.error('Block notification email failed:', e);
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing friendship:', error);
    return NextResponse.json({ error: 'Failed to manage friendship' }, { status: 500 });
  }
}

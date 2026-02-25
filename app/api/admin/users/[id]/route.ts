import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdminFromRequest } from '@/lib/admin-guard';
import { LEVELS } from '@/lib/reputation';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function deleteUserData(userId: string) {
  await supabaseAdmin.from('two_factor_codes').delete().eq('user_id', userId);
  await supabaseAdmin.from('two_factor_codes').delete().eq('userId', userId);
  await supabaseAdmin.from('follows').delete().eq('followerId', userId);
  await supabaseAdmin.from('follows').delete().eq('followingId', userId);
  await supabaseAdmin.from('gallery').delete().eq('userId', userId);
  await supabaseAdmin.from('posts').delete().eq('authorId', userId);
  await supabaseAdmin.from('posts').delete().eq('author_id', userId);
  await supabaseAdmin.from('comments').delete().eq('userId', userId);
  await supabaseAdmin.from('comments').delete().eq('authorId', userId);
  await supabaseAdmin.from('messages').delete().eq('senderId', userId);
  await supabaseAdmin.from('messages').delete().eq('receiverId', userId);
  await supabaseAdmin.from('chat_participants').delete().eq('userId', userId);
  await supabaseAdmin.from('chats').delete().eq('createdBy', userId);
  await supabaseAdmin.from('user_games').delete().eq('userId', userId);
  await supabaseAdmin.from('user_xp').delete().eq('user_id', userId);
  await supabaseAdmin.from('friendships').delete().eq('user_id', userId);
  await supabaseAdmin.from('friendships').delete().eq('friend_id', userId);
  await supabaseAdmin.from('users').delete().eq('id', userId);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const adminCheck = await requireAdminFromRequest(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await context.params;
    const { action, value } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (id === adminCheck.user.id && action === 'setBlocked' && value === true) {
      return NextResponse.json({ error: 'You cannot block your own account' }, { status: 400 });
    }

    if (id === adminCheck.user.id && action === 'setAdmin' && value === false) {
      return NextResponse.json({ error: 'You cannot remove your own admin access' }, { status: 400 });
    }

    if (action === 'setLevel') {
      const level = Number(value);
      const levelDef = LEVELS.find((l) => l.level === level);
      if (!levelDef) {
        return NextResponse.json({ error: 'Invalid level. Valid range: 1-10' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('users')
        .update({ level, xp: levelDef.xpRequired, updatedAt: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: 'Failed to update user level', details: error.message }, { status: 500 });
      }

      await supabaseAdmin.from('user_xp').upsert(
        { user_id: id, level, xp: levelDef.xpRequired, level_name: levelDef.name },
        { onConflict: 'user_id' }
      );

      return NextResponse.json({ success: true });
    }

    if (action === 'setAdmin') {
      const isAdmin = Boolean(value);
      const { error } = await supabaseAdmin
        .from('users')
        .update({ isAdmin, updatedAt: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        return NextResponse.json({ error: 'Failed to update admin role', details: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'setBlocked') {
      const blocked = Boolean(value);
      const { error } = await supabaseAdmin
        .from('users')
        .update({ isVerified: !blocked, updatedAt: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        return NextResponse.json({ error: 'Failed to update block state', details: error.message }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: blocked
          ? 'User has been blocked (sign-in disabled).'
          : 'User has been unblocked.',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const adminCheck = await requireAdminFromRequest(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    if (id === adminCheck.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account from this panel' }, { status: 400 });
    }

    await deleteUserData(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


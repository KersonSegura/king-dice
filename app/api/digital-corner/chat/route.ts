import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get or create Digital Corner public chat
export async function GET(request: NextRequest) {
  try {
    const { data: existing } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('name', 'Digital Corner Public Chat')
      .eq('type', 'public')
      .maybeSingle();

    let chat = existing;
    if (!chat) {
      const { data: created } = await supabaseAdmin
        .from('chats')
        .insert({ name: 'Digital Corner Public Chat', type: 'public', created_by: null })
        .select('*')
        .single();
      chat = created || null;
    }

    const { data: participants } = await supabaseAdmin
      .from('chat_participants')
      .select('user:users!chat_participants_user_id_fkey(id,username,avatar,is_verified,is_admin), joined_at, last_read_at')
      .eq('chat_id', chat!.id);

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select(`
        id, content, type, created_at,
        sender:users!messages_sender_id_fkey(id, username, avatar, is_verified, is_admin),
        reply_to:messages!messages_reply_to_id_fkey(id, content, created_at, sender:users!messages_sender_id_fkey(id, username, avatar))
      `)
      .eq('chat_id', chat!.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      chat: {
        id: chat!.id,
        name: chat!.name,
        type: chat!.type,
        participants: (participants || []).map((p: any) => ({
          id: p.user.id,
          username: p.user.username,
          avatar: p.user.avatar,
          isVerified: p.user.is_verified,
          isAdmin: p.user.is_admin,
          joinedAt: p.joined_at,
          lastReadAt: p.last_read_at
        })),
        messages: (messages || []).reverse().map((m: any) => ({
          id: m.id,
          content: m.content,
          type: m.type,
          createdAt: m.created_at,
          sender: m.sender ? {
            id: m.sender.id,
            username: m.sender.username,
            avatar: m.sender.avatar,
            title: m.sender.is_admin ? 'Admin' : m.sender.is_verified ? 'Verified' : undefined,
            isVerified: m.sender.is_verified,
            isAdmin: m.sender.is_admin
          } : undefined,
          replyTo: m.reply_to ? {
            id: m.reply_to.id,
            content: m.reply_to.content,
            sender: m.reply_to.sender ? {
              id: m.reply_to.sender.id,
              username: m.reply_to.sender.username,
              avatar: m.reply_to.sender.avatar
            } : undefined
          } : undefined
        })),
        createdAt: chat!.created_at,
        updatedAt: chat!.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching Digital Corner chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// POST - Join user to Digital Corner chat
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('name', 'Digital Corner Public Chat')
      .eq('type', 'public')
      .maybeSingle();

    let chat = existing;
    if (!chat) {
      const { data: created } = await supabaseAdmin
        .from('chats')
        .insert({ name: 'Digital Corner Public Chat', type: 'public', created_by: null })
        .select('*')
        .single();
      chat = created || null;
    }

    const { data: existingParticipant } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chat!.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingParticipant) {
      await supabaseAdmin
        .from('chat_participants')
        .insert({ chat_id: chat!.id, user_id: userId, joined_at: new Date().toISOString() });
    }

    return NextResponse.json({
      success: true,
      message: 'User joined Digital Corner chat',
      chatId: chat!.id
    });
  } catch (error) {
    console.error('Error joining Digital Corner chat:', error);
    return NextResponse.json({ error: 'Failed to join chat' }, { status: 500 });
  }
}



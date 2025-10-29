import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Get messages for a chat

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Fetch messages with sender info
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey (
          id,
          username,
          avatar,
          is_verified,
          is_admin
        ),
        reply_to:messages!messages_reply_to_id_fkey (
          id,
          content,
          created_at,
          sender:users!messages_sender_id_fkey (
            id,
            username,
            avatar
          )
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get total count
    const { count, error: countError } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    if (countError) {
      console.error('Error counting messages:', countError);
    }

    // Format messages
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      chatId: msg.chat_id,
      senderId: msg.sender_id,
      content: msg.content,
      type: msg.type,
      replyToId: msg.reply_to_id,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
      sender: msg.sender ? {
        id: msg.sender.id,
        username: msg.sender.username,
        avatar: msg.sender.avatar,
        isVerified: msg.sender.is_verified,
        isAdmin: msg.sender.is_admin
      } : null,
      replyTo: msg.reply_to ? {
        id: msg.reply_to.id,
        content: msg.reply_to.content,
        createdAt: msg.reply_to.created_at,
        sender: msg.reply_to.sender ? {
          id: msg.reply_to.sender.id,
          username: msg.reply_to.sender.username,
          avatar: msg.reply_to.sender.avatar
        } : null
      } : null
    })).reverse(); // Reverse to show oldest first

    return NextResponse.json({
      messages: formattedMessages,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const { chatId, senderId, content, type = 'text', replyToId } = await request.json();

    if (!chatId || !senderId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is participant in the chat
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chatId)
      .eq('user_id', senderId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'User not authorized to send messages in this chat' }, { status: 403 });
    }

    // Create message
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content,
        type,
        reply_to_id: replyToId || null
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey (
          id,
          username,
          avatar,
          is_verified,
          is_admin
        ),
        reply_to:messages!messages_reply_to_id_fkey (
          id,
          content,
          created_at,
          sender:users!messages_sender_id_fkey (
            id,
            username,
            avatar
          )
        )
      `)
      .single();

    if (messageError || !newMessage) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update chat's updatedAt timestamp
    await supabaseAdmin
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    // Format message
    const formattedMessage = {
      id: newMessage.id,
      chatId: newMessage.chat_id,
      senderId: newMessage.sender_id,
      content: newMessage.content,
      type: newMessage.type,
      replyToId: newMessage.reply_to_id,
      createdAt: newMessage.created_at,
      updatedAt: newMessage.updated_at,
      sender: newMessage.sender ? {
        id: newMessage.sender.id,
        username: newMessage.sender.username,
        avatar: newMessage.sender.avatar,
        isVerified: newMessage.sender.is_verified,
        isAdmin: newMessage.sender.is_admin
      } : null,
      replyTo: newMessage.reply_to ? {
        id: newMessage.reply_to.id,
        content: newMessage.reply_to.content,
        createdAt: newMessage.reply_to.created_at,
        sender: newMessage.reply_to.sender ? {
          id: newMessage.reply_to.sender.id,
          username: newMessage.reply_to.sender.username,
          avatar: newMessage.reply_to.sender.avatar
        } : null
      } : null
    };

    return NextResponse.json({ message: formattedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

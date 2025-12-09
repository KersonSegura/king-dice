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

    // Fetch messages with sender info - use camelCase to match database schema
    // Note: replyTo relationship removed as it causes foreign key errors in Supabase
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!messages_senderId_fkey (
          id,
          username,
          avatar,
          isVerified,
          isAdmin
        )
      `)
      .eq('chatId', chatId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get total count - use camelCase
    const { count, error: countError } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chatId', chatId);

    if (countError) {
      console.error('Error counting messages:', countError);
    }

    // Format messages - handle both camelCase and snake_case
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      chatId: msg.chatId || msg.chat_id,
      senderId: msg.senderId || msg.sender_id,
      content: msg.content,
      type: msg.type,
      replyToId: msg.replyToId || msg.reply_to_id,
      createdAt: msg.createdAt || msg.created_at,
      updatedAt: msg.updatedAt || msg.updated_at,
      sender: (msg.sender || msg.sender_id) ? {
        id: (msg.sender || {}).id || msg.sender_id,
        username: (msg.sender || {}).username,
        avatar: (msg.sender || {}).avatar,
        isVerified: (msg.sender || {}).isVerified || (msg.sender || {}).is_verified,
        isAdmin: (msg.sender || {}).isAdmin || (msg.sender || {}).is_admin
      } : null,
      replyTo: null // ReplyTo relationship removed to avoid foreign key errors
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

    // Verify user is participant in the chat - use camelCase
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .eq('chatId', chatId)
      .eq('userId', senderId)
      .maybeSingle();

    if (participantError) {
      console.error('[MESSAGES API] Error checking participant:', participantError);
      return NextResponse.json({ 
        error: 'Failed to verify participant',
        details: participantError.message
      }, { status: 500 });
    }

    if (!participant) {
      console.error('[MESSAGES API] User not found as participant:', { chatId, senderId });
      // Log all participants for debugging
      const { data: allParticipants } = await supabaseAdmin
        .from('chat_participants')
        .select('userId, chatId')
        .eq('chatId', chatId);
      console.error('[MESSAGES API] All participants in chat:', allParticipants);
      return NextResponse.json({ 
        error: 'User not authorized to send messages in this chat',
        details: 'Participant not found'
      }, { status: 403 });
    }

    // Check if sender is blocked by any participant in the chat (for direct chats)
    const { data: chatData } = await supabaseAdmin
      .from('chats')
      .select('type')
      .eq('id', chatId)
      .single();

    if (chatData?.type === 'direct') {
      // Get the other participant in the direct chat
      const { data: otherParticipants } = await supabaseAdmin
        .from('chat_participants')
        .select('userId')
        .eq('chatId', chatId)
        .neq('userId', senderId);

      if (otherParticipants && otherParticipants.length > 0) {
        const receiverId = otherParticipants[0].userId;

        // Check if receiver has blocked the sender
        const { data: blocked } = await supabaseAdmin
          .from('friendships')
          .select('id')
          .eq('userId', receiverId)
          .eq('friendId', senderId)
          .eq('status', 'blocked')
          .maybeSingle();

        if (blocked) {
          return NextResponse.json({ 
            error: 'You cannot send messages to this user. You have been blocked.',
          }, { status: 403 });
        }
      }
    }

    // Create message using Supabase
    let newMessage = null;
    let messageError = null;
    
    // First, check existing messages to see what ID format they use
    const { data: existingMessages } = await supabaseAdmin
      .from('messages')
      .select('id')
      .limit(1);
    
    console.log('[MESSAGES API] Sample existing message ID:', existingMessages?.[0]?.id);
    
    // Generate cuid - use the same format as Prisma generates
    // Prisma cuid format: c + timestamp (base36) + counter + fingerprint + random
    const timestamp = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestamp}${counter}${fingerprint}${random}`.substring(0, 25);
    
    console.log('[MESSAGES API] Generated cuid ID:', generatedId, 'Length:', generatedId.length);
    
    // Use camelCase to match database schema
    const now = new Date().toISOString();
    const insertData: any = {
      id: generatedId,
      chatId: chatId,
      senderId: senderId,
      content,
      type: type || 'text',
      createdAt: now,
      updatedAt: now
    };
    
    if (replyToId) {
      insertData.replyToId = replyToId;
    }
    
    console.log('[MESSAGES API] Inserting message with data:', {
      id: insertData.id,
      chatId: insertData.chatId,
      senderId: insertData.senderId,
      content: insertData.content?.substring(0, 50)
    });
    
    const { data: insertedMessage, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert(insertData)
      .select('id')
      .single();
    
    if (insertError) {
      console.error('[MESSAGES API] Insert failed:', insertError);
      console.error('[MESSAGES API] Full error:', JSON.stringify(insertError, null, 2));
      console.error('[MESSAGES API] Insert data sent:', JSON.stringify(insertData, null, 2));
      messageError = insertError;
    } else {
      console.log('[MESSAGES API] ✅ Success! Message created with ID:', insertedMessage?.id);
    }

    if (!insertError && insertedMessage) {
      // Fetch the complete message with relationships - use camelCase
      const { data: fullMessage, error: fetchError } = await supabaseAdmin
        .from('messages')
        .select(`
          *,
          sender:users!messages_senderId_fkey (
            id,
            username,
            avatar,
            isVerified,
            isAdmin
          )
        `)
        .eq('id', insertedMessage.id)
        .single();
      
      if (!fetchError && fullMessage) {
        newMessage = fullMessage;
      } else {
        messageError = fetchError;
        console.error('[MESSAGES API] Error fetching created message:', fetchError);
      }
    } else {
      messageError = insertError;
    }

    if (messageError || !newMessage) {
      console.error('Error creating message:', messageError);
      console.error('Message creation details:', { chatId, senderId, content, type, replyToId });
      return NextResponse.json({ 
        error: 'Failed to send message',
        details: messageError?.message || 'Unknown error'
      }, { status: 500 });
    }

    // Update chat's updatedAt timestamp
    await supabaseAdmin
      .from('chats')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', chatId);

    // Get all participants in the chat (except the sender) to create notifications
    const { data: chatParticipants } = await supabaseAdmin
      .from('chat_participants')
      .select('userId')
      .eq('chatId', chatId)
      .neq('userId', senderId);

    // Get chat info for notification
    const { data: chatInfo } = await supabaseAdmin
      .from('chats')
      .select('name, type')
      .eq('id', chatId)
      .single();

    // Get sender info for notification
    const { data: senderInfo } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', senderId)
      .single();

    // Create notifications for all participants (except sender)
    if (chatParticipants && chatParticipants.length > 0) {
      const { createNotification } = await import('@/lib/notifications');
      const notificationMessage = chatInfo?.type === 'group' 
        ? `${senderInfo?.username || 'Someone'} sent a message in "${chatInfo?.name || 'Group Chat'}"`
        : `${senderInfo?.username || 'Someone'} sent you a message`;
      
      for (const participant of chatParticipants) {
        await createNotification({
          userId: participant.userId,
          type: 'message',
          actorId: senderId,
          entityType: 'chat',
          entityId: chatId,
          url: `/chat/${chatId}`,
          message: notificationMessage
        });
      }
    }

    // Format message - handle both column naming conventions
    const formattedMessage = {
      id: newMessage.id,
      chatId: newMessage.chat_id || newMessage.chatId,
      senderId: newMessage.sender_id || newMessage.senderId,
      content: newMessage.content,
      type: newMessage.type,
      replyToId: newMessage.reply_to_id || newMessage.replyToId,
      createdAt: newMessage.created_at || newMessage.createdAt,
      updatedAt: newMessage.updated_at || newMessage.updatedAt,
      sender: newMessage.sender ? {
        id: newMessage.sender.id,
        username: newMessage.sender.username,
        avatar: newMessage.sender.avatar,
        isVerified: newMessage.sender.is_verified !== undefined ? newMessage.sender.is_verified : newMessage.sender.isVerified,
        isAdmin: newMessage.sender.is_admin !== undefined ? newMessage.sender.is_admin : newMessage.sender.isAdmin
      } : null,
      replyTo: null // ReplyTo relationship not fetched to avoid foreign key errors
    };

    return NextResponse.json({ message: formattedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}



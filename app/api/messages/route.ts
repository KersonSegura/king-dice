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

    // Fetch messages with sender info - use snake_case to match database schema
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

    // Get total count - use snake_case
    const { count, error: countError } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId);

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
      replyTo: (msg.replyTo || msg.reply_to) ? {
        id: (msg.replyTo || msg.reply_to || {}).id,
        content: (msg.replyTo || msg.reply_to || {}).content,
        createdAt: (msg.replyTo || msg.reply_to || {}).createdAt || (msg.replyTo || msg.reply_to || {}).created_at,
        sender: ((msg.replyTo || msg.reply_to || {}).sender) ? {
          id: (msg.replyTo || msg.reply_to || {}).sender.id,
          username: (msg.replyTo || msg.reply_to || {}).sender.username,
          avatar: (msg.replyTo || msg.reply_to || {}).sender.avatar
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

    // Verify user is participant in the chat - use snake_case
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chatId)
      .eq('user_id', senderId)
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
        .select('user_id, chat_id')
        .eq('chat_id', chatId);
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
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', senderId);

      if (otherParticipants && otherParticipants.length > 0) {
        const receiverId = otherParticipants[0].user_id;

        // Check if receiver has blocked the sender
        const { data: blocked } = await supabaseAdmin
          .from('friendships')
          .select('id')
          .eq('user_id', receiverId)
          .eq('friend_id', senderId)
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
    
    // Use snake_case to match database schema
    const now = new Date().toISOString();
    const insertData: any = {
      id: generatedId,
      chat_id: chatId,
      sender_id: senderId,
      content,
      type: type || 'text',
      created_at: now,
      updated_at: now
    };
    
    if (replyToId) {
      insertData.reply_to_id = replyToId;
    }
    
    console.log('[MESSAGES API] Inserting message with data:', {
      id: insertData.id,
      chat_id: insertData.chat_id,
      sender_id: insertData.sender_id,
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
      // Fetch the complete message with relationships - use snake_case
      const { data: fullMessage, error: fetchError } = await supabaseAdmin
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey (
            id,
            username,
            avatar,
            is_verified,
            is_admin
          )
        `)
        .eq('id', insertedMessage.id)
        .single();
      
      if (!fetchError && fullMessage) {
        newMessage = fullMessage;
        
        // Fetch reply_to separately if needed
        const replyId = fullMessage.replyToId || fullMessage.reply_to_id;
        if (replyToId && replyId) {
          const { data: replyMessage } = await supabaseAdmin
            .from('messages')
            .select(`
              id,
              content,
              createdAt,
              created_at,
              sender:users!messages_senderId_fkey (
                id,
                username,
                avatar
              )
            `)
            .eq('id', replyId)
            .single();
          
          if (replyMessage) {
            newMessage.reply_to = replyMessage;
          }
        }
      } else {
        messageError = fetchError;
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

    // Update chat's updated_at timestamp
    await supabaseAdmin
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

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
      replyTo: (newMessage.reply_to || newMessage.replyTo) ? {
        id: (newMessage.reply_to || newMessage.replyTo).id,
        content: (newMessage.reply_to || newMessage.replyTo).content,
        createdAt: (newMessage.reply_to || newMessage.replyTo).created_at || (newMessage.reply_to || newMessage.replyTo).createdAt,
        sender: (newMessage.reply_to || newMessage.replyTo).sender ? {
          id: (newMessage.reply_to || newMessage.replyTo).sender.id,
          username: (newMessage.reply_to || newMessage.replyTo).sender.username,
          avatar: (newMessage.reply_to || newMessage.replyTo).sender.avatar
        } : null
      } : null
    };

    return NextResponse.json({ message: formattedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}



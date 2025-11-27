import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Get user's chats

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get all chats where user is a participant
    // Fetch participants and chats separately to avoid foreign key relationship issues
    const { data: participantRows, error: participantRowsError } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id, joined_at, last_read_at')
      .eq('user_id', userId);

    if (participantRowsError) {
      console.error('Error fetching chat participants:', participantRowsError);
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }

    if (!participantRows || participantRows.length === 0) {
      return NextResponse.json({ chats: [] });
    }

    const chatIds = participantRows.map(p => p.chat_id).filter(Boolean);
    
    // Fetch chats separately
    const { data: chatsData, error: chatsError } = await supabaseAdmin
      .from('chats')
      .select('id, name, type, created_by, created_at, updated_at')
      .in('id', chatIds);

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }

    // Get creator info for each chat
    const creatorIds = (chatsData || []).map(c => c.created_by).filter(Boolean);
    const { data: creatorsData } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar')
      .in('id', creatorIds);

    const creatorsMap = new Map((creatorsData || []).map(c => [c.id, c]));
    
    // Combine participant data with chat data
    const participants = participantRows.map(p => ({
      chat_id: p.chat_id,
      joined_at: p.joined_at,
      last_read_at: p.last_read_at,
      chat: {
        ...(chatsData || []).find(c => c.id === p.chat_id),
        creator: (chatsData || []).find(c => c.id === p.chat_id)?.created_by 
          ? creatorsMap.get((chatsData || []).find(c => c.id === p.chat_id)?.created_by) 
          : null
      }
    }));

    if (!participants || participants.length === 0) {
      return NextResponse.json({ chats: [] });
    }

    // Get last message for each chat
    const { data: lastMessages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        chat_id,
        content,
        type,
        created_at,
        sender:users!messages_sender_id_fkey (
          id,
          username,
          avatar
        )
      `)
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false });

    // Group messages by chat_id and get the first (latest) one for each
    const lastMessageMap = new Map();
    if (lastMessages) {
      for (const msg of lastMessages) {
        if (!lastMessageMap.has(msg.chat_id)) {
          lastMessageMap.set(msg.chat_id, msg);
        }
      }
    }

    // Get all participants for each chat (fetch separately to avoid foreign key issues)
    const { data: allParticipantRows, error: allParticipantsError } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id, user_id, joined_at, last_read_at')
      .in('chat_id', chatIds);
    
    // Get user info for all participants
    const userIds = (allParticipantRows || []).map(p => p.user_id).filter(Boolean);
    const { data: usersData } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar, is_verified, is_admin')
      .in('id', userIds);
    
    const usersMap = new Map((usersData || []).map(u => [u.id, u]));
    
    // Combine participant data with user data
    const allParticipants = (allParticipantRows || []).map(p => ({
      ...p,
      user: usersMap.get(p.user_id) || null
    }));

    // Group participants by chat_id
    const participantsMap = new Map();
    if (allParticipants) {
      for (const p of allParticipants) {
        if (!participantsMap.has(p.chat_id)) {
          participantsMap.set(p.chat_id, []);
        }
        participantsMap.get(p.chat_id).push(p);
      }
    }

    // Format the response
    const formattedChats = participants.map((p: any) => {
      const chat = p.chat;
      const chatParticipants = participantsMap.get(chat.id) || [];
      const lastMessage = lastMessageMap.get(chat.id);
      const otherParticipants = chatParticipants
        .filter((cp: any) => cp.user_id !== userId)
        .map((cp: any) => cp.user);

      return {
        id: chat.id,
        name: chat.name || (chat.type === 'direct' ? otherParticipants[0]?.username : 'Group Chat'),
        type: chat.type,
        participants: chatParticipants.map((cp: any) => ({
          id: cp.user.id,
          username: cp.user.username,
          avatar: cp.user.avatar,
          isVerified: cp.user.is_verified,
          isAdmin: cp.user.is_admin,
          joinedAt: cp.joined_at,
          lastReadAt: cp.last_read_at
        })),
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          type: lastMessage.type,
          createdAt: lastMessage.created_at,
          sender: lastMessage.sender ? {
            id: lastMessage.sender.id,
            username: lastMessage.sender.username,
            avatar: lastMessage.sender.avatar
          } : null
        } : null,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        createdBy: chat.creator
      };
    }).sort((a: any, b: any) => {
      // Sort by updatedAt descending
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ chats: formattedChats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

// POST - Create a new chat
export async function POST(request: NextRequest) {
  try {
    const { type, name, participants, createdBy } = await request.json();

    if (!type || !participants || !Array.isArray(participants)) {
      return NextResponse.json({ error: 'Invalid chat data' }, { status: 400 });
    }

    if (type === 'group' && !name) {
      return NextResponse.json({ error: 'Group chat name is required' }, { status: 400 });
    }

    // Check if direct chat already exists between these two users
    if (type === 'direct' && participants.length === 2) {
      // Get all chats of type 'direct' that have both participants
      const { data: existingParticipants, error: checkError } = await supabaseAdmin
        .from('chat_participants')
        .select('chat_id, user_id, chat:chats!chat_participants_chat_id_fkey (id, type)')
        .in('user_id', participants)
        .eq('chat.type', 'direct');

      if (!checkError && existingParticipants) {
        // Group by chat_id and check if any chat has both users
        const chatMap = new Map();
        for (const p of existingParticipants) {
          if (!chatMap.has(p.chat_id)) {
            chatMap.set(p.chat_id, new Set());
          }
          chatMap.get(p.chat_id).add(p.user_id);
        }

        // Find a chat with both participants
        for (const [chatId, userIds] of chatMap.entries()) {
          if (userIds.size === 2 && participants.every((id: string) => userIds.has(id))) {
            // Fetch the full chat data
            const { data: existingChat, error: fetchError } = await supabaseAdmin
              .from('chats')
              .select(`
                *,
                participants:chat_participants (
                  user_id,
                  joined_at,
                  last_read_at,
                  user:users!chat_participants_user_id_fkey (
                    id,
                    username,
                    avatar,
                    is_verified,
                    is_admin
                  )
                ),
                creator:users!chats_created_by_fkey (
                  id,
                  username,
                  avatar
                )
              `)
              .eq('id', chatId)
              .single();

            if (!fetchError && existingChat) {
              return NextResponse.json({ 
                chat: {
                  id: existingChat.id,
                  name: existingChat.name,
                  type: existingChat.type,
                  participants: (existingChat.participants || []).map((p: any) => ({
                    id: p.user.id,
                    username: p.user.username,
                    avatar: p.user.avatar,
                    isVerified: p.user.is_verified,
                    isAdmin: p.user.is_admin,
                    joinedAt: p.joined_at,
                    lastReadAt: p.last_read_at
                  })),
                  createdAt: existingChat.created_at,
                  updatedAt: existingChat.updated_at,
                  createdBy: existingChat.creator
                },
                message: 'Direct chat already exists'
              });
            }
          }
        }
      }
    }

    // Create new chat
    const { data: newChat, error: createError } = await supabaseAdmin
      .from('chats')
      .insert({
        type,
        name: type === 'group' ? name : null,
        created_by: type === 'group' ? createdBy : null
      })
      .select()
      .single();

    if (createError || !newChat) {
      console.error('Error creating chat:', createError);
      return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
    }

    // Add participants
    const participantInserts = participants.map((userId: string) => ({
      chat_id: newChat.id,
      user_id: userId,
      joined_at: new Date().toISOString()
    }));

    const { error: participantsError } = await supabaseAdmin
      .from('chat_participants')
      .insert(participantInserts);

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      // Try to clean up the chat
      await supabaseAdmin.from('chats').delete().eq('id', newChat.id);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    // Fetch the complete chat with participants and creator
    const { data: completeChat, error: fetchError } = await supabaseAdmin
      .from('chats')
      .select(`
        *,
        participants:chat_participants (
          user_id,
          joined_at,
          last_read_at,
          user:users!chat_participants_user_id_fkey (
            id,
            username,
            avatar,
            is_verified,
            is_admin
          )
        ),
        creator:users!chats_created_by_fkey (
          id,
          username,
          avatar
        )
      `)
      .eq('id', newChat.id)
      .single();

    if (fetchError || !completeChat) {
      console.error('Error fetching created chat:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch created chat' }, { status: 500 });
    }

    // Find other participant for direct chats
    const otherParticipant = (completeChat.participants || []).find((p: any) => p.user_id !== createdBy);

    return NextResponse.json({ 
      chat: {
        id: completeChat.id,
        name: completeChat.name || (completeChat.type === 'direct' ? 
          otherParticipant?.user?.username : 
          'Group Chat'
        ),
        type: completeChat.type,
        participants: (completeChat.participants || []).map((p: any) => ({
          id: p.user.id,
          username: p.user.username,
          avatar: p.user.avatar,
          isVerified: p.user.is_verified,
          isAdmin: p.user.is_admin,
          joinedAt: p.joined_at,
          lastReadAt: p.last_read_at
        })),
        createdAt: completeChat.created_at,
        updatedAt: completeChat.updated_at,
        createdBy: completeChat.creator
      }
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}

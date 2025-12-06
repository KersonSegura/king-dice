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

    console.log('[CHATS API] Creating chat:', { type, name, participants, createdBy });

    if (!type || !participants || !Array.isArray(participants)) {
      return NextResponse.json({ error: 'Invalid chat data' }, { status: 400 });
    }

    if (type === 'group' && !name) {
      return NextResponse.json({ error: 'Group chat name is required' }, { status: 400 });
    }

    // Check if direct chat already exists between these two users
    if (type === 'direct' && participants.length === 2) {
      console.log('[CHATS API] Checking for existing direct chat between:', participants);
      
      // Try snake_case first (most common in Supabase)
      let existingParticipants: any[] = [];
      let checkError: any = null;
      
      const { data: participantsSnake, error: errorSnake } = await supabaseAdmin
        .from('chat_participants')
        .select('chat_id, user_id')
        .in('user_id', participants);
      
      if (!errorSnake && participantsSnake) {
        existingParticipants = participantsSnake;
      } else {
        // Try camelCase as fallback
        const { data: participantsCamel, error: errorCamel } = await supabaseAdmin
          .from('chat_participants')
          .select('chatId, userId')
          .in('userId', participants);
        
        if (!errorCamel && participantsCamel) {
          existingParticipants = participantsCamel.map((p: any) => ({
            chat_id: p.chatId || p.chat_id,
            user_id: p.userId || p.user_id
          }));
        } else {
          checkError = errorSnake || errorCamel;
        }
      }

      if (checkError) {
        console.error('[CHATS API] Error checking existing participants:', checkError);
      }

      if (existingParticipants && existingParticipants.length > 0) {
        // Group by chat_id and check if any chat has both users
        const chatMap = new Map<string, Set<string>>();
        for (const p of existingParticipants) {
          const chatId = p.chat_id || p.chatId;
          const userId = p.user_id || p.userId;
          if (!chatMap.has(chatId)) {
            chatMap.set(chatId, new Set());
          }
          chatMap.get(chatId)!.add(userId);
        }

        // Find a chat with both participants and check if it's a direct chat
        for (const [chatId, userIds] of chatMap.entries()) {
          if (userIds.size === 2 && participants.every((id: string) => userIds.has(id))) {
            // Check if this chat is a direct chat
            const { data: chatCheck, error: chatCheckError } = await supabaseAdmin
              .from('chats')
              .select('id, type')
              .eq('id', chatId)
              .eq('type', 'direct')
              .maybeSingle();
            
            if (!chatCheckError && chatCheck && chatCheck.type === 'direct') {
              // Fetch the full chat data - try both naming conventions
              let existingChat: any = null;
              let fetchError: any = null;
              
              // Try snake_case first
              const { data: chatSnake, error: errorSnake } = await supabaseAdmin
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
              
              if (!errorSnake && chatSnake) {
                existingChat = chatSnake;
              } else {
                // Try camelCase
                const { data: chatCamel, error: errorCamel } = await supabaseAdmin
                  .from('chats')
                  .select(`
                    *,
                    participants:chat_participants (
                      userId,
                      joinedAt,
                      lastReadAt,
                      user:users!chat_participants_userId_fkey (
                        id,
                        username,
                        avatar,
                        isVerified,
                        isAdmin
                      )
                    ),
                    creator:users!chats_createdBy_fkey (
                      id,
                      username,
                      avatar
                    )
                  `)
                  .eq('id', chatId)
                  .single();
                
                if (!errorCamel && chatCamel) {
                  existingChat = chatCamel;
                } else {
                  fetchError = errorSnake || errorCamel;
                }
              }

              if (!fetchError && existingChat) {
                console.log('[CHATS API] Found existing direct chat:', existingChat.id);
                
                // Format participants based on which naming convention was used
                const formattedParticipants = (existingChat.participants || []).map((p: any) => {
                  const user = p.user || {};
                  return {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    isVerified: user.is_verified || user.isVerified || false,
                    isAdmin: user.is_admin || user.isAdmin || false,
                    joinedAt: p.joined_at || p.joinedAt,
                    lastReadAt: p.last_read_at || p.lastReadAt
                  };
                });

                return NextResponse.json({ 
                  chat: {
                    id: existingChat.id,
                    name: existingChat.name || formattedParticipants.find((p: any) => p.id !== createdBy)?.username,
                    type: existingChat.type,
                    participants: formattedParticipants,
                    createdAt: existingChat.created_at || existingChat.createdAt,
                    updatedAt: existingChat.updated_at || existingChat.updatedAt,
                    createdBy: existingChat.creator
                  },
                  message: 'Direct chat already exists'
                });
              }
            }
          }
        }
      }
    }

    console.log('[CHATS API] Creating new chat...');
    
    // Generate CUID for chat ID (same format as Prisma generates)
    const timestamp = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedChatId = `c${timestamp}${counter}${fingerprint}${random}`.substring(0, 25);
    
    // Create new chat - don't set createdBy for direct chats (optional field)
    const now = new Date().toISOString();
    const chatData: any = {
      id: generatedChatId,
      type,
      name: type === 'group' ? name : null
    };
    
    // Only set createdBy for group chats
    if (type === 'group' && createdBy) {
      chatData.createdBy = createdBy;
    }
    
    // Try camelCase first (Prisma schema)
    const { data: newChat, error: createError } = await supabaseAdmin
      .from('chats')
      .insert(chatData)
      .select()
      .single();

    if (createError || !newChat) {
      console.error('[CHATS API] Error creating chat:', createError);
      return NextResponse.json({ 
        error: 'Failed to create chat',
        details: createError?.message || 'Unknown error'
      }, { status: 500 });
    }

    console.log('[CHATS API] Chat created, ID:', newChat.id);

    // Add participants - generate CUIDs for each participant
    const generateParticipantId = () => {
      const timestamp = Date.now().toString(36);
      const counter = Math.floor(Math.random() * 36).toString(36);
      const fingerprint = Math.floor(Math.random() * 36).toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      return `c${timestamp}${counter}${fingerprint}${random}`.substring(0, 25);
    };
    
    let participantsError: any = null;
    const joinedAt = new Date().toISOString();
    
    // Try camelCase first (matches database schema)
    const participantInsertsCamel = participants.map((userId: string) => ({
      id: generateParticipantId(),
      chatId: newChat.id,
      userId: userId,
      joinedAt: joinedAt
    }));
    
    const { error: errorCamelPart } = await supabaseAdmin
      .from('chat_participants')
      .insert(participantInsertsCamel);
    
    if (errorCamelPart) {
      // Try snake_case as fallback
      const participantInsertsSnake = participants.map((userId: string) => ({
        id: generateParticipantId(),
        chat_id: newChat.id,
        user_id: userId,
        joined_at: joinedAt
      }));
      
      const { error: errorSnakePart } = await supabaseAdmin
        .from('chat_participants')
        .insert(participantInsertsSnake);
      
      if (errorSnakePart) {
        participantsError = errorSnakePart;
      }
    }

    if (participantsError) {
      console.error('[CHATS API] Error adding participants:', participantsError);
      // Try to clean up the chat
      await supabaseAdmin.from('chats').delete().eq('id', newChat.id);
      return NextResponse.json({ 
        error: 'Failed to add participants',
        details: participantsError?.message || 'Unknown error'
      }, { status: 500 });
    }

    console.log('[CHATS API] Participants added, fetching complete chat...');

    // Fetch the complete chat with participants and creator - try both naming conventions
    let completeChat: any = null;
    let fetchError: any = null;
    
    // Try snake_case first
    const { data: completeSnake, error: errorFetchSnake } = await supabaseAdmin
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
    
    if (!errorFetchSnake && completeSnake) {
      completeChat = completeSnake;
    } else {
      // Try camelCase
      const { data: completeCamel, error: errorFetchCamel } = await supabaseAdmin
        .from('chats')
        .select(`
          *,
          participants:chat_participants (
            userId,
            joinedAt,
            lastReadAt,
            user:users!chat_participants_userId_fkey (
              id,
              username,
              avatar,
              isVerified,
              isAdmin
            )
          ),
          creator:users!chats_createdBy_fkey (
            id,
            username,
            avatar
          )
        `)
        .eq('id', newChat.id)
        .single();
      
      if (!errorFetchCamel && completeCamel) {
        completeChat = completeCamel;
      } else {
        fetchError = errorFetchSnake || errorFetchCamel;
      }
    }

    if (fetchError || !completeChat) {
      console.error('[CHATS API] Error fetching created chat:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch created chat',
        details: fetchError?.message || 'Unknown error'
      }, { status: 500 });
    }

    // Find other participant for direct chats
    const otherParticipant = (completeChat.participants || []).find((p: any) => {
      const userId = p.user_id || p.userId;
      return userId !== createdBy;
    });

    // Format participants
    const formattedParticipants = (completeChat.participants || []).map((p: any) => {
      const user = p.user || {};
      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isVerified: user.is_verified || user.isVerified || false,
        isAdmin: user.is_admin || user.isAdmin || false,
        joinedAt: p.joined_at || p.joinedAt,
        lastReadAt: p.last_read_at || p.lastReadAt
      };
    });

    console.log('[CHATS API] Chat created successfully:', completeChat.id);

    return NextResponse.json({ 
      chat: {
        id: completeChat.id,
        name: completeChat.name || (completeChat.type === 'direct' ? 
          otherParticipant?.user?.username : 
          'Group Chat'
        ),
        type: completeChat.type,
        participants: formattedParticipants,
        createdAt: completeChat.created_at || completeChat.createdAt,
        updatedAt: completeChat.updated_at || completeChat.updatedAt,
        createdBy: completeChat.creator
      }
    });
  } catch (error: any) {
    console.error('[CHATS API] Exception creating chat:', error);
    return NextResponse.json({ 
      error: 'Failed to create chat',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

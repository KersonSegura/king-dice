import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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
      .select('chatId, joinedAt, lastReadAt')
      .eq('userId', userId);

    if (participantRowsError) {
      console.error('Error fetching chat participants:', participantRowsError);
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }

    if (!participantRows || participantRows.length === 0) {
      return NextResponse.json({ chats: [] });
    }

    const chatIds = participantRows.map(p => p.chatId).filter(Boolean);
    
    // Fetch chats separately
    const { data: chatsData, error: chatsError } = await supabaseAdmin
      .from('chats')
      .select('id, name, type, createdBy, createdAt, updatedAt')
      .in('id', chatIds);

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }

    // Get creator info for each chat
    const creatorIds = (chatsData || []).map(c => c.createdBy).filter(Boolean);
    const { data: creatorsData } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar')
      .in('id', creatorIds);

    const creatorsMap = new Map((creatorsData || []).map(c => [c.id, c]));
    
    // Combine participant data with chat data
    const participants = participantRows.map(p => ({
      chatId: p.chatId,
      joinedAt: p.joinedAt,
      lastReadAt: p.lastReadAt,
      chat: {
        ...(chatsData || []).find(c => c.id === p.chatId),
        creator: (chatsData || []).find(c => c.id === p.chatId)?.createdBy 
          ? creatorsMap.get((chatsData || []).find(c => c.id === p.chatId)?.createdBy) 
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
        chatId,
        content,
        type,
        createdAt,
        sender:users!messages_senderId_fkey (
          id,
          username,
          avatar
        )
      `)
      .in('chatId', chatIds)
      .order('createdAt', { ascending: false });

    // Group messages by chatId and get the first (latest) one for each
    const lastMessageMap = new Map();
    if (lastMessages) {
      for (const msg of lastMessages) {
        if (!lastMessageMap.has(msg.chatId)) {
          lastMessageMap.set(msg.chatId, msg);
        }
      }
    }

    // Get all participants for each chat (fetch separately to avoid foreign key issues)
    const { data: allParticipantRows, error: allParticipantsError } = await supabaseAdmin
      .from('chat_participants')
      .select('chatId, userId, joinedAt, lastReadAt')
      .in('chatId', chatIds);
    
    // Get user info for all participants
    const userIds = (allParticipantRows || []).map(p => p.userId).filter(Boolean);
    const { data: usersData } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar, isVerified, isAdmin')
      .in('id', userIds);
    
    const usersMap = new Map((usersData || []).map(u => [u.id, u]));
    
    // Combine participant data with user data
    const allParticipants = (allParticipantRows || []).map(p => ({
      ...p,
      user: usersMap.get(p.userId) || null
    }));

    // Group participants by chatId
    const participantsMap = new Map();
    if (allParticipants) {
      for (const p of allParticipants) {
        if (!participantsMap.has(p.chatId)) {
          participantsMap.set(p.chatId, []);
        }
        participantsMap.get(p.chatId).push(p);
      }
    }

    // Format the response
    const formattedChats = participants.map((p: any) => {
      const chat = p.chat;
      const chatParticipants = participantsMap.get(chat.id) || [];
      const lastMessage = lastMessageMap.get(chat.id);
      const otherParticipants = chatParticipants
        .filter((cp: any) => cp.userId !== userId)
        .map((cp: any) => cp.user);

      return {
        id: chat.id,
        name: chat.name || (chat.type === 'direct' ? otherParticipants[0]?.username : 'Group Chat'),
        type: chat.type,
        participants: chatParticipants.map((cp: any) => ({
          id: cp.user.id,
          username: cp.user.username,
          avatar: cp.user.avatar,
          isVerified: cp.user.isVerified,
          isAdmin: cp.user.isAdmin,
          joinedAt: cp.joinedAt,
          lastReadAt: cp.lastReadAt
        })),
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          type: lastMessage.type,
          createdAt: lastMessage.createdAt,
          sender: lastMessage.sender ? {
            id: lastMessage.sender.id,
            username: lastMessage.sender.username,
            avatar: lastMessage.sender.avatar
          } : null
        } : null,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
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
    
    // Create new chat - use camelCase to match database schema
    const now = new Date().toISOString();
    const chatData: any = {
      id: generatedChatId,
      type,
      name: type === 'group' ? name : null,
      createdAt: now,
      updatedAt: now
    };
    
    // Only set createdBy for group chats
    if (type === 'group' && createdBy) {
      chatData.createdBy = createdBy;
    }
    
    // Use snake_case (matches database schema)
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
    
    // Use camelCase to match database schema
    const participantInserts = participants.map((userId: string) => ({
      id: generateParticipantId(),
      chatId: newChat.id,
      userId: userId,
      joinedAt: joinedAt
    }));
    
    const { error: participantsInsertError } = await supabaseAdmin
      .from('chat_participants')
      .insert(participantInserts);
    
    if (participantsInsertError) {
      participantsError = participantsInsertError;
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

// DELETE - Delete a chat
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Get current user from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user using getUserFromToken
    const authResult = await getUserFromToken(token);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;

    // Check if user is a participant
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .eq('chatId', chatId)
      .eq('userId', userId)
      .maybeSingle();

    if (participantError || !participant) {
      // Try snake_case
      const { data: participantSnake } = await supabaseAdmin
        .from('chat_participants')
        .select('id')
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!participantSnake) {
        return NextResponse.json({ error: 'Unauthorized to delete this chat' }, { status: 403 });
      }
    }

    // Delete all messages in the chat first (cascade might handle this, but being explicit)
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('chatId', chatId);

    // Delete all participants
    await supabaseAdmin
      .from('chat_participants')
      .delete()
      .eq('chatId', chatId);

    // Delete the chat
    const { error: deleteError } = await supabaseAdmin
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (deleteError) {
      console.error('[CHATS API] Error deleting chat:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete chat',
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error: any) {
    console.error('[CHATS API] Exception deleting chat:', error);
    return NextResponse.json({ 
      error: 'Failed to delete chat',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH - Add participants to an existing group chat
export async function PATCH(request: NextRequest) {
  try {
    const { chatId, userIds, currentUserId } = await request.json();

    if (!chatId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Chat ID and user IDs array are required' }, { status: 400 });
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'Current user ID is required' }, { status: 400 });
    }

    // Verify chat exists and is a group chat
    const { data: chatData, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('type')
      .eq('id', chatId)
      .single();

    if (chatError || !chatData) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chatData.type !== 'group') {
      return NextResponse.json({ error: 'Can only add participants to group chats' }, { status: 400 });
    }

    // Verify current user is a participant
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .eq('chatId', chatId)
      .eq('userId', currentUserId)
      .maybeSingle();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'You must be a participant to add members' }, { status: 403 });
    }

    // Get existing participants to avoid duplicates
    const { data: existingParticipants } = await supabaseAdmin
      .from('chat_participants')
      .select('userId')
      .eq('chatId', chatId);

    const existingUserIds = (existingParticipants || []).map((p: any) => p.userId);
    const newUserIds = userIds.filter((userId: string) => !existingUserIds.includes(userId));

    if (newUserIds.length === 0) {
      return NextResponse.json({ 
        message: 'All users are already participants',
        added: 0
      });
    }

    // Generate CUIDs for new participants
    const generateParticipantId = () => {
      const timestamp = Date.now().toString(36);
      const counter = Math.floor(Math.random() * 36).toString(36);
      const fingerprint = Math.floor(Math.random() * 36).toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      return `c${timestamp}${counter}${fingerprint}${random}`.substring(0, 25);
    };

    const joinedAt = new Date().toISOString();
    const participantInserts = newUserIds.map((userId: string) => ({
      id: generateParticipantId(),
      chatId: chatId,
      userId: userId,
      joinedAt: joinedAt
    }));

    const { error: insertError } = await supabaseAdmin
      .from('chat_participants')
      .insert(participantInserts);

    if (insertError) {
      console.error('[CHATS API] Error adding participants:', insertError);
      return NextResponse.json({ 
        error: 'Failed to add participants',
        details: insertError.message
      }, { status: 500 });
    }

    // Update chat's updatedAt timestamp
    await supabaseAdmin
      .from('chats')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', chatId);

    return NextResponse.json({ 
      message: 'Participants added successfully',
      added: newUserIds.length
    });
  } catch (error: any) {
    console.error('[CHATS API] Exception adding participants:', error);
    return NextResponse.json({ 
      error: 'Failed to add participants',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

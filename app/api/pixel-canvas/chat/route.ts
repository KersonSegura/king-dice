import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get or create Pixel Canvas public chat
export async function GET(request: NextRequest) {
  try {
    // Ensure chat exists
    const { data: existing } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('name', 'Pixel Canvas Public Chat')
      .eq('type', 'public')
      .maybeSingle();

    let chat = existing;
    if (!chat) {
      const { data: created } = await supabaseAdmin
        .from('chats')
        .insert({ name: 'Pixel Canvas Public Chat', type: 'public', created_by: null })
        .select('*')
        .single();
      chat = created || null;
    }

    // Load participants - simplified approach
    let participants = null;
    
    // Try snake_case first (most common in Supabase)
    const { data: participantsSnake, error: participantsErrorSnake } = await supabaseAdmin
      .from('chat_participants')
      .select('user:users!chat_participants_user_id_fkey(id,username,avatar,is_verified,is_admin), joined_at, last_read_at')
      .eq('chat_id', chat!.id);
    
    if (!participantsErrorSnake && participantsSnake) {
      participants = participantsSnake;
    } else {
      // Try camelCase as fallback
      const { data: participantsCamel, error: participantsErrorCamel } = await supabaseAdmin
        .from('chat_participants')
        .select('user:users!chat_participants_userId_fkey(id,username,avatar,isVerified,isAdmin), joinedAt, lastReadAt')
        .eq('chatId', chat!.id);
      
      if (!participantsErrorCamel && participantsCamel) {
        participants = participantsCamel;
      }
    }

    // Load last 50 messages - database uses camelCase (chatId, createdAt, senderId)
    let messages: any[] | null = null;
    
    const { data: messagesData, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        id, content, type, createdAt,
        sender:users!messages_senderId_fkey(id, username, avatar, isVerified, isAdmin)
      `)
      .eq('chatId', chat!.id)
      .order('createdAt', { ascending: false })
      .limit(50);
    
    if (!messagesError && messagesData) {
      messages = messagesData;
      console.log('[PIXEL CANVAS API] Loaded', messages.length, 'messages');
    } else {
      console.error('[PIXEL CANVAS API] Error loading messages:', messagesError);
      messages = [];
    }

    return NextResponse.json({
      success: true,
      chat: {
        id: chat!.id,
        name: chat!.name,
        type: chat!.type,
        participants: (participants || []).map((p: any) => ({
          id: p.user?.id,
          username: p.user?.username,
          avatar: p.user?.avatar,
          isVerified: p.user?.isVerified !== undefined ? p.user.isVerified : p.user?.is_verified,
          isAdmin: p.user?.isAdmin !== undefined ? p.user.isAdmin : p.user?.is_admin,
          joinedAt: p.joinedAt || p.joined_at,
          lastReadAt: p.lastReadAt || p.last_read_at
        })),
        messages: ((messages || []) as any[]).reverse().map((m: any) => ({
          id: m.id,
          content: m.content,
          type: m.type,
          createdAt: m.createdAt,
          sender: m.sender ? {
            id: m.sender.id,
            username: m.sender.username,
            avatar: m.sender.avatar,
            title: m.sender.isAdmin ? 'Admin' : m.sender.isVerified ? 'Verified' : undefined,
            isVerified: m.sender.isVerified || false,
            isAdmin: m.sender.isAdmin || false
          } : undefined
        })),
        createdAt: chat!.created_at,
        updatedAt: chat!.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching Pixel Canvas chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// POST - Join user to Pixel Canvas chat
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get or create Pixel Canvas public chat
    const { data: existing } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('name', 'Pixel Canvas Public Chat')
      .eq('type', 'public')
      .maybeSingle();

    let chat = existing;
    if (!chat) {
      const { data: created } = await supabaseAdmin
        .from('chats')
        .insert({ name: 'Pixel Canvas Public Chat', type: 'public', created_by: null })
        .select('*')
        .single();
      chat = created || null;
    }

    // Ensure participant exists - try camelCase first, then snake_case
    let existingParticipant = null;
    let participantError = null;
    
    // Try camelCase first (matches database schema)
    const { data: participantCamel, error: errorCamel } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .eq('chatId', chat!.id)
      .eq('userId', userId)
      .maybeSingle();
    
    if (!errorCamel && participantCamel) {
      existingParticipant = participantCamel;
    } else {
      // Try snake_case as fallback
      const { data: participantSnake, error: errorSnake } = await supabaseAdmin
        .from('chat_participants')
        .select('id')
        .eq('chat_id', chat!.id)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!errorSnake && participantSnake) {
        existingParticipant = participantSnake;
      } else {
        participantError = errorSnake || errorCamel;
      }
    }

    if (!existingParticipant) {
      console.log('[PIXEL CANVAS API] Adding participant:', { chatId: chat!.id, userId });
      
      // Try inserting with camelCase first (matches database schema)
      const { data: insertDataCamel, error: insertErrorCamel } = await supabaseAdmin
        .from('chat_participants')
        .insert({ chatId: chat!.id, userId: userId, joinedAt: new Date().toISOString() })
        .select('id')
        .single();
      
      if (insertErrorCamel) {
        console.log('[PIXEL CANVAS API] CamelCase insert failed, trying snake_case:', insertErrorCamel);
        
        // Try snake_case as fallback
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('chat_participants')
          .insert({ chat_id: chat!.id, user_id: userId, joined_at: new Date().toISOString() })
          .select('id')
          .single();
        
        if (insertError) {
          console.error('[PIXEL CANVAS API] Error inserting participant:', insertError);
          return NextResponse.json({ 
            error: 'Failed to join chat', 
            details: insertError.message,
            camelCaseError: insertErrorCamel.message,
            snakeCaseError: insertError.message
          }, { status: 500 });
        } else {
          console.log('[PIXEL CANVAS API] Participant added successfully (snake_case):', insertData);
        }
      } else {
        console.log('[PIXEL CANVAS API] Participant added successfully (camelCase):', insertDataCamel);
      }
    } else {
      console.log('[PIXEL CANVAS API] Participant already exists:', existingParticipant);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User joined Pixel Canvas chat',
      chatId: chat!.id
    });
  } catch (error) {
    console.error('Error joining Pixel Canvas chat:', error);
    return NextResponse.json({ error: 'Failed to join chat' }, { status: 500 });
  }
}

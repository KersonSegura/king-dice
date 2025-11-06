import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Get unread messages count for a user

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get all chats where the user is a participant
    // Try camelCase first, fallback to snake_case
    let { data: userChats, error: participantsError } = await supabaseAdmin
      .from('chat_participants')
      .select('chatId, lastReadAt')
      .eq('userId', userId);
    
    // If camelCase failed, try snake_case
    if (participantsError && (participantsError.code === '42703' || participantsError.code === 'PGRST116')) {
      console.log('[UNREAD API] Trying snake_case column names...');
      const altResult = await supabaseAdmin
        .from('chat_participants')
        .select('chat_id, last_read_at')
        .eq('user_id', userId);
      
      if (!altResult.error) {
        userChats = altResult.data;
        participantsError = null;
      }
    }

    if (participantsError) {
      console.error('Error fetching chat participants:', participantsError);
      return NextResponse.json({ error: 'Failed to fetch chat participants' }, { status: 500 });
    }

    if (!userChats || userChats.length === 0) {
      return NextResponse.json({ 
        unreadCount: 0,
        success: true 
      });
    }

    let totalUnreadCount = 0;

    // For each chat, count unread messages
    for (const participant of userChats) {
      const chatId = participant.chatId || participant.chat_id;
      const last_read_at = participant.lastReadAt || participant.last_read_at;
      
      if (!chatId) continue;
      
      // If user has never read messages in this chat, count all messages
      // Convert last_read_at to ISO string for comparison, or use epoch 0
      const cutoffDate = last_read_at ? new Date(last_read_at).toISOString() : new Date(0).toISOString();
      
      // Count messages in this chat that are newer than lastReadAt and not from the user
      // Try camelCase first, then snake_case
      let { count, error: countError } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chatId', chatId)
        .gt('createdAt', cutoffDate)
        .neq('senderId', userId);
      
      // If camelCase failed, try snake_case
      if (countError && countError.code === '42703') {
        const altCountResult = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .gt('created_at', cutoffDate)
          .neq('sender_id', userId);
        
        if (!altCountResult.error) {
          count = altCountResult.count;
          countError = null;
        }
      }

      if (countError) {
        console.error(`Error counting messages for chat ${chatId}:`, countError);
        continue; // Skip this chat if there's an error
      }
      
      totalUnreadCount += count || 0;
    }

    console.log(`📱 Unread count for user ${userId}: ${totalUnreadCount}`);

    return NextResponse.json({ 
      unreadCount: totalUnreadCount,
      success: true 
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch unread count',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Mark messages as read in a specific chat
export async function POST(request: NextRequest) {
  try {
    const { userId, chatId } = await request.json();

    if (!userId || !chatId) {
      return NextResponse.json({ error: 'User ID and Chat ID are required' }, { status: 400 });
    }

    // Update the lastReadAt timestamp for this user in this chat
    const now = new Date().toISOString();
    // Try camelCase first
    let { data: updatedParticipant, error: updateError } = await supabaseAdmin
      .from('chat_participants')
      .update({ lastReadAt: now })
      .eq('chatId', chatId)
      .eq('userId', userId)
      .select('lastReadAt')
      .single();
    
    // If camelCase failed, try snake_case
    if (updateError && updateError.code === '42703') {
      const altUpdateResult = await supabaseAdmin
        .from('chat_participants')
        .update({ last_read_at: now })
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .select('last_read_at')
        .single();
      
      if (!altUpdateResult.error) {
        updatedParticipant = altUpdateResult.data;
        updateError = null;
      }
    }

    if (updateError) {
      console.error('Error updating lastReadAt:', updateError);
      return NextResponse.json({ 
        error: 'Failed to mark messages as read',
        details: updateError.message
      }, { status: 500 });
    }

    console.log(`✅ Marked messages as read for user ${userId} in chat ${chatId}`);

    return NextResponse.json({ 
      success: true,
      lastReadAt: updatedParticipant?.lastReadAt || updatedParticipant?.last_read_at || now
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ 
      error: 'Failed to mark messages as read',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

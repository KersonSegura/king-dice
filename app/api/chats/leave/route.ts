import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// POST - Leave a group chat (remove participant)
export async function POST(request: NextRequest) {
  try {
    const { chatId, userId } = await request.json();

    if (!chatId || !userId) {
      return NextResponse.json({ error: 'Chat ID and user ID are required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Can only leave group chats' }, { status: 400 });
    }

    // Verify user is a participant
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .eq('chatId', chatId)
      .eq('userId', userId)
      .maybeSingle();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'You are not a participant in this group' }, { status: 403 });
    }

    // Remove the participant from the chat
    const { error: deleteError } = await supabaseAdmin
      .from('chat_participants')
      .delete()
      .eq('chatId', chatId)
      .eq('userId', userId);

    if (deleteError) {
      console.error('[CHATS LEAVE API] Error removing participant:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to leave group',
        details: deleteError.message
      }, { status: 500 });
    }

    // Update chat's updatedAt timestamp
    await supabaseAdmin
      .from('chats')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', chatId);

    return NextResponse.json({ 
      success: true,
      message: 'Successfully left the group'
    });
  } catch (error: any) {
    console.error('[CHATS LEAVE API] Exception leaving group:', error);
    return NextResponse.json({ 
      error: 'Failed to leave group',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}


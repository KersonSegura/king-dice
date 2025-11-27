import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// POST - Reset Pixel Canvas chat by deleting all messages
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate reset request (from cron job or admin)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    const internalToken = 'Bearer internal-reset-token';
    
    // Allow both cron secret and internal token
    if (authHeader !== `Bearer ${cronSecret}` && authHeader !== internalToken) {
      console.log('Unauthorized reset request attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get or find Pixel Canvas chat
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('id, name')
      .eq('name', 'Pixel Canvas Public Chat')
      .eq('type', 'public')
      .maybeSingle();
    
    if (chatError) {
      console.error('[PIXEL CANVAS RESET] Error finding chat:', chatError);
      return NextResponse.json({
        success: false,
        error: 'Failed to find chat',
        details: chatError.message
      }, { status: 500 });
    }
    
    if (!chat) {
      console.warn('[PIXEL CANVAS RESET] No chat found with name "Pixel Canvas Public Chat"');
      // Try to find any chat with similar name
      const { data: similarChats } = await supabaseAdmin
        .from('chats')
        .select('id, name, type')
        .ilike('name', '%Pixel Canvas%')
        .eq('type', 'public');
      
      console.log('[PIXEL CANVAS RESET] Found similar chats:', similarChats);
      
      return NextResponse.json({
        success: false,
        message: 'No chat found to reset',
        deletedCount: 0,
        similarChats: similarChats || []
      });
    }
    
    console.log('[PIXEL CANVAS RESET] Found chat:', { id: chat.id, name: chat.name });
    
    // Delete all messages from this chat - try camelCase first
    const { data: deletedCamel, error: deleteErrorCamel } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('chatId', chat.id)
      .select('id');
    
    let deletedCount = 0;
    let deleteError = null;
    
    if (!deleteErrorCamel && deletedCamel) {
      deletedCount = deletedCamel.length;
    } else {
      // Try snake_case as fallback
      const { data: deletedSnake, error: deleteErrorSnake } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('chat_id', chat.id)
        .select('id');
      
      if (!deleteErrorSnake && deletedSnake) {
        deletedCount = deletedSnake.length;
      } else {
        deleteError = deleteErrorSnake || deleteErrorCamel;
      }
    }
    
    if (deleteError) {
      console.error('[PIXEL CANVAS RESET] Error deleting messages:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete messages',
        details: deleteError.message
      }, { status: 500 });
    }
    
    console.log(`[PIXEL CANVAS RESET] ✅ Deleted ${deletedCount} messages from Pixel Canvas chat`);
    
    return NextResponse.json({
      success: true,
      message: 'Pixel Canvas chat reset completed',
      deletedCount,
      resetAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting Pixel Canvas chat:', error);
    return NextResponse.json(
      { error: 'Failed to reset chat', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Get reset info (next reset time)
export async function GET(request: NextRequest) {
  try {
    // Calculate next midnight UTC
    const now = new Date();
    const nextMidnightUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1, // Tomorrow
      0, 0, 0, 0 // 00:00:00
    ));
    
    return NextResponse.json({
      success: true,
      nextResetTime: nextMidnightUTC.toISOString(),
      currentTime: now.toISOString()
    });
  } catch (error) {
    console.error('Error getting reset info:', error);
    return NextResponse.json(
      { error: 'Failed to get reset info' },
      { status: 500 }
    );
  }
}



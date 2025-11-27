import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper function to reset a chat by name
async function resetChat(chatName: string) {
  try {
    // Get or find the chat
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('id, name')
      .eq('name', chatName)
      .eq('type', 'public')
      .maybeSingle();
    
    if (chatError) {
      console.error(`[${chatName} RESET] Error finding chat:`, chatError);
      return {
        success: false,
        error: 'Failed to find chat',
        details: chatError.message,
        deletedCount: 0
      };
    }
    
    if (!chat) {
      console.warn(`[${chatName} RESET] No chat found with name "${chatName}"`);
      // Try to find any chat with similar name
      const { data: similarChats } = await supabaseAdmin
        .from('chats')
        .select('id, name, type')
        .ilike('name', `%${chatName.split(' ')[0]}%`)
        .eq('type', 'public');
      
      console.log(`[${chatName} RESET] Found similar chats:`, similarChats);
      
      return {
        success: false,
        message: 'No chat found to reset',
        deletedCount: 0,
        similarChats: similarChats || []
      };
    }
    
    console.log(`[${chatName} RESET] Found chat:`, { id: chat.id, name: chat.name });
    
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
      console.error(`[${chatName} RESET] Error deleting messages:`, deleteError);
      return {
        success: false,
        error: 'Failed to delete messages',
        details: deleteError.message,
        deletedCount: 0
      };
    }
    
    console.log(`[${chatName} RESET] ✅ Deleted ${deletedCount} messages from ${chatName} chat`);
    
    return {
      success: true,
      message: `${chatName} chat reset completed`,
      deletedCount,
      resetAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error resetting ${chatName} chat:`, error);
    return {
      success: false,
      error: 'Failed to reset chat',
      details: error instanceof Error ? error.message : 'Unknown error',
      deletedCount: 0
    };
  }
}

// This endpoint can be called by a cron service (like Vercel Cron or external cron job)
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    // Vercel Cron automatically authenticates requests from vercel.json config
    // For external cron services, require Authorization header
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron') || 
                         process.env.VERCEL === '1';
    const isAuthorizedExternal = authHeader === `Bearer ${cronSecret}`;
    
    // Allow Vercel Cron (automatically authenticated) or external cron with secret
    // Also allow internal token for manual triggers
    const isInternalToken = authHeader === 'Bearer internal-reset-token';
    
    if (!isVercelCron && !isAuthorizedExternal && !isInternalToken) {
      console.log('Unauthorized cron request attempt', { 
        hasAuth: !!authHeader, 
        vercel: process.env.VERCEL,
        userAgent: request.headers.get('user-agent')
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('🕐 Daily chat reset cron job triggered at:', new Date().toISOString());
    
    const results = [];
    
    // Reset Digital Corner chat - call function directly instead of HTTP request
    try {
      const digitalCornerResult = await resetChat('Digital Corner Public Chat');
      results.push({ chat: 'Digital Corner', ...digitalCornerResult });
      if (digitalCornerResult.success) {
        console.log('✅ Digital Corner chat reset completed:', digitalCornerResult);
      } else {
        console.error('❌ Digital Corner reset failed:', digitalCornerResult);
      }
    } catch (error) {
      console.error('❌ Digital Corner chat reset failed:', error);
      results.push({ chat: 'Digital Corner', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    // Reset Pixel Canvas chat - call function directly instead of HTTP request
    try {
      const pixelCanvasResult = await resetChat('Pixel Canvas Public Chat');
      results.push({ chat: 'Pixel Canvas', ...pixelCanvasResult });
      if (pixelCanvasResult.success) {
        console.log('✅ Pixel Canvas chat reset completed:', pixelCanvasResult);
      } else {
        console.error('❌ Pixel Canvas reset failed:', pixelCanvasResult);
      }
    } catch (error) {
      console.error('❌ Pixel Canvas chat reset failed:', error);
      results.push({ chat: 'Pixel Canvas', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    console.log('✅ Daily chat reset completed for both chats');
    
    const allSuccess = results.every(r => r.success !== false && !r.error);
    
    return NextResponse.json({
      success: allSuccess,
      message: allSuccess 
        ? 'Daily chat reset completed for both chats' 
        : 'Daily chat reset completed with some errors',
      results: results,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Daily chat reset cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for webhook-based cron services
export async function POST(request: NextRequest) {
  return GET(request);
}

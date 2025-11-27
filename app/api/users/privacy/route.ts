import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get user's privacy settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_private')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('Error fetching privacy settings:', error);
      // Return default privacy settings if user not found
      return NextResponse.json({
        success: true,
        privacy: {
          isPrivate: false
        }
      });
    }

    return NextResponse.json({
      success: true,
      privacy: {
        isPrivate: user.is_private || false
      }
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json({ error: 'Failed to fetch privacy settings' }, { status: 500 });
  }
}

// POST - Update user's privacy settings
export async function POST(request: NextRequest) {
  try {
    const { userId, isPrivate } = await request.json();

    if (!userId || typeof isPrivate !== 'boolean') {
      return NextResponse.json({ error: 'User ID and privacy setting are required' }, { status: 400 });
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ is_private: isPrivate })
      .eq('id', userId)
      .select('is_private')
      .single();

    if (updateError || !updatedUser) {
      console.error('Error updating privacy settings:', updateError);
      return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      privacy: {
        isPrivate: updatedUser.is_private || false
      }
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
  }
}

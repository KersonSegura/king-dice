import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';

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
      .select('isPrivate')
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
        isPrivate: user.isPrivate || false
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
    // SECURITY: Check authentication
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and get authenticated user
    const authResult = await getUserFromToken(token);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const authenticatedUser = authResult.user;
    const { userId, isPrivate } = await request.json();

    if (!userId || typeof isPrivate !== 'boolean') {
      return NextResponse.json({ error: 'User ID and privacy setting are required' }, { status: 400 });
    }

    // SECURITY: Only allow users to update their own privacy settings
    if (userId !== authenticatedUser.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own privacy settings' },
        { status: 403 }
      );
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ isPrivate: isPrivate })
      .eq('id', userId)
      .select('isPrivate')
      .single();

    if (updateError || !updatedUser) {
      console.error('Error updating privacy settings:', updateError);
      return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      privacy: {
        isPrivate: updatedUser.isPrivate || false
      }
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
  }
}

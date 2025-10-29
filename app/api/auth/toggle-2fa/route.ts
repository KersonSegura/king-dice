import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, enabled } = await request.json();

    if (!userId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    // Update user's 2FA status
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ two_factor_enabled: enabled })
      .eq('id', userId)
      .select('id, username, email, two_factor_enabled')
      .single();

    if (updateError || !updatedUser) {
      console.error('Error updating 2FA status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update 2FA status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        twoFactorEnabled: updatedUser.two_factor_enabled
      }
    });

  } catch (error) {
    console.error('Error toggling 2FA:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

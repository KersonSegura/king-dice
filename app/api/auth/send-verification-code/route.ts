import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { emailService, generateVerificationCode } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, username } = await request.json();

    if (!userId || !email || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate 6-digit verification code
    const code = generateVerificationCode();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Clean up any existing unused codes for this user
    await supabaseAdmin
      .from('two_factor_codes')
      .delete()
      .eq('user_id', userId)
      .eq('used', false);

    // Save the new verification code
    const { error: createError } = await supabaseAdmin
      .from('two_factor_codes')
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt,
        used: false
      });

    if (createError) {
      console.error('Error creating verification code:', createError);
      return NextResponse.json(
        { error: 'Failed to create verification code' },
        { status: 500 }
      );
    }

    // Send verification code via email
    const emailSent = await emailService.sendVerificationCode(email, code, username);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully'
    });

  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

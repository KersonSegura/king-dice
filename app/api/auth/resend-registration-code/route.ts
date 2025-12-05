import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { emailService, generateVerificationCode } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find pending registration by email
    const { data: pendingData, error: pendingError } = await supabaseAdmin
      .from('pending_registrations')
      .select('*')
      .ilike('email', email)
      .limit(1);

    if (pendingError) {
      console.error('Error finding pending registration:', pendingError);
      return NextResponse.json(
        { error: 'Failed to find registration. Please try registering again.' },
        { status: 500 }
      );
    }

    if (!pendingData || pendingData.length === 0) {
      return NextResponse.json(
        { error: 'No pending registration found for this email. Please register again.' },
        { status: 404 }
      );
    }

    const pendingRegistration = pendingData[0];

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Update pending registration with new code
    const { error: updateError } = await supabaseAdmin
      .from('pending_registrations')
      .update({
        verification_code: verificationCode,
        expires_at: expiresAt
      })
      .eq('id', pendingRegistration.id);

    if (updateError) {
      console.error('Error updating verification code:', updateError);
      return NextResponse.json(
        { error: 'Failed to update verification code' },
        { status: 500 }
      );
    }

    // Send verification code via email
    const emailSent = await emailService.sendRegistrationVerificationCode(
      pendingRegistration.email,
      verificationCode,
      pendingRegistration.username
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code resent successfully'
    });

  } catch (error) {
    console.error('Error resending verification code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


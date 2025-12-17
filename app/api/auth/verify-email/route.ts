import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, code, userId } = await request.json();

    // Support both old flow (userId) and new flow (email)
    // For new registrations, we use email + code
    // For existing users, we use userId + code
    if (!code || (!email && !userId)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let pendingRegistration: any = null;
    let user: any = null;

    // If email is provided, this is a new registration - look up pending_registrations
    if (email) {
      console.log('📧 verify-email: Looking up pending registration for email:', email);
      
      // Trim and validate code format (must be 6 digits)
      const trimmedCode = code.trim();
      if (!/^\d{6}$/.test(trimmedCode)) {
        console.log('❌ verify-email: Invalid code format (not 6 digits)');
        return NextResponse.json(
          { error: 'Invalid verification code format. Please enter a 6-digit code.' },
          { status: 400 }
        );
      }

      // Find pending registration by email and code
      // Code comparison is case-sensitive and exact match required
      const { data: pendingData, error: pendingError } = await supabaseAdmin
        .from('pending_registrations')
        .select('*')
        .ilike('email', email.trim())
        .eq('verification_code', trimmedCode)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (pendingError) {
        console.error('❌ verify-email: Error looking up pending registration:', pendingError);
        return NextResponse.json(
          { error: 'Failed to verify code. Please try again.' },
          { status: 500 }
        );
      }

      if (!pendingData || pendingData.length === 0) {
        // Log failed attempt for security monitoring (without revealing the actual code)
        console.log('❌ verify-email: Invalid code attempt for email:', email);
        return NextResponse.json(
          { error: 'Invalid or expired verification code. Please check the code sent to your email.' },
          { status: 400 }
        );
      }
      
      // Additional security: Verify we got exactly one match
      if (pendingData.length !== 1) {
        console.error('⚠️ verify-email: Multiple pending registrations found for email:', email);
        return NextResponse.json(
          { error: 'Multiple registrations found. Please contact support.' },
          { status: 500 }
        );
      }

      pendingRegistration = pendingData[0];

      // Generate CUID for user ID
      const generateCuid = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 15);
        const random2 = Math.random().toString(36).substring(2, 15);
        return `c${timestamp}${random}${random2}`.substring(0, 25);
      };

      const userId = generateCuid();
      const now = new Date().toISOString();

      // Create user from pending registration data
      console.log('📝 verify-email: Creating user from pending registration...');
      const { data: newUser, error: createUserError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          username: pendingRegistration.username,
          email: pendingRegistration.email,
          passwordHash: pendingRegistration.password_hash,
          avatar: pendingRegistration.avatar || '/DefaultDiceAvatar.svg',
          level: 1,
          xp: 0,
          isAdmin: false,
          isVerified: true, // User is verified since they entered the code
          createdAt: now,
          updatedAt: now,
          joinDate: now
        })
        .select('id, username, email, avatar, isAdmin, level, xp, isVerified')
        .single();

      if (createUserError || !newUser) {
        console.error('❌ verify-email: Error creating user:', createUserError);
        return NextResponse.json(
          { error: 'Failed to create account. Please try registering again.' },
          { status: 500 }
        );
      }

      console.log('✅ verify-email: User created:', newUser.username);

      // Delete pending registration
      await supabaseAdmin
        .from('pending_registrations')
        .delete()
        .eq('id', pendingRegistration.id);

      console.log('✅ verify-email: Pending registration cleaned up');

      user = newUser;

    } else if (userId) {
      // Old flow: existing user verifying email (2FA or email change)
      // Find the verification code linked to the user
      const { data: verificationCodes, error: codeError } = await supabaseAdmin
        .from('two_factor_codes')
        .select('*, users(*)')
        .eq('user_id', userId)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      // Try camelCase if snake_case fails
      let verificationCode: any = null;
      if (codeError || !verificationCodes || verificationCodes.length === 0) {
        const { data: codesCamel, error: errorCamel } = await supabaseAdmin
          .from('two_factor_codes')
          .select('*, users(*)')
          .eq('userId', userId)
          .eq('code', code)
          .eq('used', false)
          .gt('expiresAt', new Date().toISOString())
          .limit(1);

        if (!errorCamel && codesCamel && codesCamel.length > 0) {
          verificationCode = codesCamel[0];
        }
      } else {
        verificationCode = verificationCodes[0];
      }

      if (!verificationCode) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code' },
          { status: 400 }
        );
      }

      user = verificationCode.users as any;

      // Mark the code as used
      await supabaseAdmin
        .from('two_factor_codes')
        .update({ used: true })
        .eq('id', verificationCode.id);

      // Verify the user's email
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ isVerified: true })
        .eq('id', userId);

      if (updateError) {
        console.error('Error verifying user:', updateError);
        return NextResponse.json(
          { error: 'Failed to verify email' },
          { status: 500 }
        );
      }
    }

    // Generate JWT token for successful verification
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || user.is_admin || false
    });

    // Create response with user data and token
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar || '/DefaultDiceAvatar.svg',
          isAdmin: user.isAdmin || user.is_admin || false,
          level: user.level || 1,
          xp: user.xp || 0,
          isVerified: true
        },
        token
      },
      { status: 200 }
    );

    // Set secure HTTP-only cookie for the token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    };

    response.cookies.set('auth_token', token, cookieOptions);

    return response;

  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

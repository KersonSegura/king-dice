import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { supabaseAdmin } from '@/lib/supabase';
import { generateToken, generateDefaultAvatar } from '@/lib/auth';

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();

/**
 * POST /api/verify-google-id-token
 * Accepts idToken from native Google Sign-In (e.g. @react-native-google-signin/google-signin).
 * Verifies the token, finds or creates the user, returns our auth token.
 * Lives outside /api/auth/ to avoid NextAuth catch-all intercepting POST requests.
 */
export async function POST(request: NextRequest) {
  try {
    if (!googleClientId) {
      return NextResponse.json({ message: 'Google sign-in not configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';

    if (!idToken) {
      return NextResponse.json({ message: 'idToken is required' }, { status: 400 });
    }

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) {
      return NextResponse.json({ message: 'Invalid token payload' }, { status: 400 });
    }

    const providerId = payload.sub;
    const email = payload.email.trim().toLowerCase();
    const name = payload.name || payload.email.split('@')[0];
    const picture = payload.picture || null;

    // Find existing user by email or provider
    const { data: existingByEmail } = await supabaseAdmin
      .from('users')
      .select('id, username, email, avatar, isAdmin, level, xp')
      .eq('email', email)
      .maybeSingle();

    const { data: existingByProvider } = await supabaseAdmin
      .from('users')
      .select('id, username, email, avatar, isAdmin, level, xp')
      .eq('provider', 'google')
      .eq('provider_id', providerId)
      .maybeSingle();

    let user = existingByEmail || existingByProvider;

    if (user) {
      // Link provider if not already linked
      try {
        await supabaseAdmin
          .from('users')
          .update({
            provider: 'google',
            provider_id: providerId,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch {
        // Ignore if provider columns don't exist
      }

      const token = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        isAdmin: !!user.isAdmin,
      });

      if (!token) {
        return NextResponse.json({ message: 'Failed to generate token' }, { status: 500 });
      }

      return NextResponse.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar || '/DiceLogo.svg',
        },
      });
    }

    // Create new user
    const baseUsername = name.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
    let username = baseUsername;
    let counter = 1;
    while (true) {
      const { data: check } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('username', username)
        .limit(1);
      if (!check?.length) break;
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const defaultAvatar = picture || (await generateDefaultAvatar());
    const userId = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`.substring(0, 25);
    const now = new Date().toISOString();

    const userData: Record<string, unknown> = {
      id: userId,
      username,
      email,
      avatar: defaultAvatar,
      password_hash: null,
      level: 1,
      xp: 0,
      isAdmin: false,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
      joinDate: now,
      provider: 'google',
      provider_id: providerId,
    };

    const { error: createError } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select('id')
      .single();

    if (createError) {
      if (createError.code === '42703' || createError.message?.includes('provider')) {
        delete userData.provider;
        delete userData.provider_id;
        const { error: retry } = await supabaseAdmin
          .from('users')
          .insert(userData)
          .select('id')
          .single();
        if (retry) {
          console.error('Error creating Google user:', retry);
          return NextResponse.json({ message: 'Failed to create account' }, { status: 500 });
        }
      } else {
        console.error('Error creating Google user:', createError);
        return NextResponse.json({ message: 'Failed to create account' }, { status: 500 });
      }
    }

    const token = generateToken({
      userId,
      username,
      email,
      isAdmin: false,
    });

    if (!token) {
      return NextResponse.json({ message: 'Failed to generate token' }, { status: 500 });
    }

    return NextResponse.json({
      token,
      user: {
        id: userId,
        username,
        email,
        avatar: defaultAvatar,
      },
    });
  } catch (error) {
    console.error('verify-google-id-token error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}

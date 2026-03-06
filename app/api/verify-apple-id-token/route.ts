import { NextRequest, NextResponse } from 'next/server';
import verifyAppleToken from 'verify-apple-id-token';
import { supabaseAdmin } from '@/lib/supabase';
import { generateToken, generateDefaultAvatar } from '@/lib/auth';

const appleClientId = process.env.APPLE_CLIENT_ID?.trim();

/**
 * POST /api/verify-apple-id-token
 * Accepts identityToken from native Apple Sign-In (expo-apple-authentication).
 * Verifies the token, finds or creates the user, returns our auth token.
 * Lives outside /api/auth/ to avoid NextAuth catch-all intercepting POST requests.
 */
export async function POST(request: NextRequest) {
  try {
    if (!appleClientId) {
      return NextResponse.json({ message: 'Apple sign-in not configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const identityToken = typeof body.identityToken === 'string' ? body.identityToken.trim() : '';
    const fullName = body.fullName as { givenName?: string; familyName?: string } | undefined;

    if (!identityToken) {
      return NextResponse.json({ message: 'identityToken is required' }, { status: 400 });
    }

    const jwtClaims = await verifyAppleToken({
      idToken: identityToken,
      clientId: appleClientId,
    });

    const providerId = jwtClaims.sub;
    const email = (jwtClaims.email as string)?.trim()?.toLowerCase();
    const nameFromToken = jwtClaims.email ? jwtClaims.email.split('@')[0] : 'user';
    const displayName =
      fullName?.givenName || fullName?.familyName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
        : nameFromToken;

    if (!providerId) {
      return NextResponse.json({ message: 'Invalid token payload' }, { status: 400 });
    }

    // Apple may not return email on subsequent sign-ins; we need it for lookup
    // If no email, try to find by provider_id only
    let user = null;

    if (email) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, username, email, avatar, isAdmin, level, xp')
        .eq('email', email)
        .maybeSingle();
      user = data;
    }

    if (!user) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, username, email, avatar, isAdmin, level, xp')
        .eq('provider', 'apple')
        .eq('provider_id', providerId)
        .maybeSingle();
      user = data;
    }

    if (user) {
      // Link provider if not already
      try {
        await supabaseAdmin
          .from('users')
          .update({
            provider: 'apple',
            provider_id: providerId,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch {
        // Ignore
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

    // New user - Apple requires email on first sign-in, but it can be a relay
    const userEmail = email || `${providerId}@privaterelay.appleid.com`;
    const baseUsername = displayName.toLowerCase().replace(/\s+/g, '_').substring(0, 20) || 'user';
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

    const defaultAvatar = await generateDefaultAvatar();
    const userId = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`.substring(0, 25);
    const now = new Date().toISOString();

    const userData: Record<string, unknown> = {
      id: userId,
      username,
      email: userEmail,
      avatar: defaultAvatar,
      password_hash: null,
      level: 1,
      xp: 0,
      isAdmin: false,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
      joinDate: now,
      provider: 'apple',
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
          console.error('Error creating Apple user:', retry);
          return NextResponse.json({ message: 'Failed to create account' }, { status: 500 });
        }
      } else {
        console.error('Error creating Apple user:', createError);
        return NextResponse.json({ message: 'Failed to create account' }, { status: 500 });
      }
    }

    const token = generateToken({
      userId,
      username,
      email: userEmail,
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
        email: userEmail,
        avatar: defaultAvatar,
      },
    });
  } catch (error) {
    console.error('verify-apple-id-token error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}

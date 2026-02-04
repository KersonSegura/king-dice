import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';
import { isUserAdmin } from '@/lib/admin-utils';
import { LEVELS } from '@/lib/reputation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // Verify user is authenticated
    const authResult = await getUserFromToken(token);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const authenticatedUser = authResult.user;

    // SECURITY: Only admins can set user levels
    const isAdmin = authenticatedUser.isAdmin || isUserAdmin(
      authenticatedUser.id,
      authenticatedUser.username,
      authenticatedUser.email
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can set user levels' },
        { status: 403 }
      );
    }

    // Get username from request body (defaults to authenticated user's username)
    const { username, targetLevel } = await request.json();
    const targetUsername = username || authResult.user.username;
    const level = targetLevel || 9;

    // Validate level
    const levelDef = LEVELS.find(l => l.level === level);
    if (!levelDef) {
      return NextResponse.json(
        { error: `Invalid level: ${level}. Valid levels are 1-10.` },
        { status: 400 }
      );
    }

    // Find user by username
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .eq('username', targetUsername)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: `User not found: ${targetUsername}` },
        { status: 404 }
      );
    }

    const requiredXP = levelDef.xpRequired;
    const levelName = levelDef.name;

    // Update users table
    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({
        level: level,
        xp: requiredXP
      })
      .eq('id', user.id);

    if (updateUserError) {
      console.error('Error updating users table:', updateUserError);
      return NextResponse.json(
        { error: 'Failed to update user level in users table', details: updateUserError.message },
        { status: 500 }
      );
    }

    // Update or create user_xp table entry
    const { error: upsertError } = await supabaseAdmin
      .from('user_xp')
      .upsert({
        user_id: user.id,
        username: user.username,
        xp: requiredXP,
        level: level,
        level_name: levelName
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error upserting user_xp table:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update user level in user_xp table', details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully set ${targetUsername} to level ${level} (${levelName})`,
      user: {
        id: user.id,
        username: user.username,
        level: level,
        levelName: levelName,
        xp: requiredXP
      }
    });

  } catch (error) {
    console.error('Error setting user level:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


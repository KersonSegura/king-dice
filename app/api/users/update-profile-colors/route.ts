import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Check authentication first
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and get authenticated user
    const authResult = await getUserFromToken(token);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { message: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const authenticatedUser = authResult.user;
    const { userId, colors } = await request.json();

    if (!userId || !colors) {
      return NextResponse.json(
        { message: 'User ID and colors are required' },
        { status: 400 }
      );
    }

    // SECURITY: Only allow users to update their own profile colors
    if (userId !== authenticatedUser.id) {
      return NextResponse.json(
        { message: 'Forbidden - You can only update your own profile colors' },
        { status: 403 }
      );
    }

    // Validate colors
    const { cover, background, containers } = colors;
    if (!cover || !background || !containers) {
      return NextResponse.json(
        { message: 'All color values are required' },
        { status: 400 }
      );
    }

    // Update or create user profile colors (store as JSON string in users.profile_colors)
    const colorsJson = JSON.stringify({ cover, background, containers });

    // Try update first
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('users')
      .update({ profile_colors: colorsJson })
      .eq('id', userId)
      .select('id, username, email, profile_colors')
      .single();

    let user = updated;
    if (updErr && (updErr.code === 'PGRST116' || updErr.message?.includes('0 rows'))) {
      // Create minimal user row if missing
      const { data: created, error: createErr } = await supabaseAdmin
        .from('users')
        .insert({ id: userId, username: 'User', email: 'user@example.com', profile_colors: colorsJson })
        .select('id, username, email, profile_colors')
        .single();
      if (createErr) {
        console.error('Error creating user/colors:', createErr);
        return NextResponse.json({ message: 'Failed to update profile colors' }, { status: 500 });
      }
      user = created;
    } else if (updErr) {
      console.error('Error updating colors:', updErr);
      return NextResponse.json({ message: 'Failed to update profile colors' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Error updating profile colors:', error);
    return NextResponse.json(
      { message: 'Failed to update profile colors' },
      { status: 500 }
    );
  }
}

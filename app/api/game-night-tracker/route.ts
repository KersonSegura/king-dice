import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';

// Helper to get authenticated user from request
async function getAuthUser(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
    
    if (!token) {
      return null;
    }
    
    const authResult = await getUserFromToken(token);
    if (authResult.success && authResult.user) {
      return authResult.user;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting auth user:', error);
    return null;
  }
}

// GET - Fetch user's game night trackers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');
    const username = searchParams.get('username');

    if (shareId) {
      // Fetch shared tracker by share_id (public access)
      const { data, error } = await supabaseAdmin
        .from('game_night_trackers')
        .select('*')
        .eq('share_id', shareId)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Tracker not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ tracker: data });
    }

    if (username) {
      // Fetch tracker by username (public access for viewing)
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username')
        .ilike('username', username)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from('game_night_trackers')
        .select('*')
        .eq('user_id', userData.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching tracker by username:', error);
        return NextResponse.json(
          { error: 'Failed to fetch tracker' },
          { status: 500 }
        );
      }

      // Return user info even if no tracker exists (so page can create one or show empty state)
      if (!data || data.length === 0) {
        return NextResponse.json({ 
          tracker: null,
          user: { id: userData.id, username: userData.username }
        });
      }

      return NextResponse.json({ tracker: data[0], user: { id: userData.id, username: userData.username } });
    }

    // Fetch user's trackers (requires authentication)
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('game_night_trackers')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching trackers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trackers' },
        { status: 500 }
      );
    }

    return NextResponse.json({ trackers: data || [] });
  } catch (error) {
    console.error('Error in GET /api/game-night-tracker:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new tracker
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { trackerName, gameFilter, players, gameTabs } = body;

    // Generate share_id
    const shareId = `gnt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabaseAdmin
      .from('game_night_trackers')
      .insert({
        user_id: user.id,
        tracker_name: trackerName || 'My Game Night Tracker',
        share_id: shareId,
        game_filter: gameFilter || null,
        players: players || [],
        game_tabs: gameTabs || null, // Store tabs as JSONB
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tracker:', error);
      return NextResponse.json(
        { error: 'Failed to create tracker' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tracker: data });
  } catch (error) {
    console.error('Error in POST /api/game-night-tracker:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing tracker
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, trackerName, gameFilter, players, gameTabs } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Tracker ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('game_night_trackers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (trackerName !== undefined) updateData.tracker_name = trackerName;
    if (gameFilter !== undefined) updateData.game_filter = gameFilter;
    if (players !== undefined) updateData.players = players;
    if (gameTabs !== undefined) updateData.game_tabs = gameTabs;

    const { data, error } = await supabaseAdmin
      .from('game_night_trackers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tracker:', error);
      return NextResponse.json(
        { error: 'Failed to update tracker' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tracker: data });
  } catch (error) {
    console.error('Error in PUT /api/game-night-tracker:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a tracker
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Tracker ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('game_night_trackers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('game_night_trackers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tracker:', error);
      return NextResponse.json(
        { error: 'Failed to delete tracker' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/game-night-tracker:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

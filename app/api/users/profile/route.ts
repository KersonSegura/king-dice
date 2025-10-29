import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const userId = searchParams.get('userId');

    if (!username && !userId) {
      return NextResponse.json({ error: 'Username or userId is required' }, { status: 400 });
    }

    // Find user in database by username or userId
    const { data: users, error: findError } = await supabaseAdmin
      .from('users')
      .select('*')
      .or(username ? `username.eq.${username}` : `id.eq.${userId}`)
      .limit(1)
      .single();

    if (findError || !users) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users;

    // Calculate level progress
    const levelNames = {
      1: 'Commoner', 2: 'Squire', 3: 'Knight', 4: 'Champion', 5: 'Baron/Baroness',
      6: 'Lord/Lady', 7: 'Archmage', 8: 'Duke/Duchess', 9: 'Lord/Lady', 10: 'King/Queen'
    };

    const currentLevel = user.level || 1;
    const currentXP = user.xp || 0;
    const xpForNextLevel = currentLevel < 10 ? (currentLevel * 100) - currentXP : 0;
    const progressPercentage = currentLevel < 10 ? (currentXP / (currentLevel * 100)) * 100 : 100;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio || '',
        favoriteGames: user.favorite_games ? (typeof user.favorite_games === 'string' ? JSON.parse(user.favorite_games) : user.favorite_games) : [],
        profileColors: user.profile_colors ? (typeof user.profile_colors === 'string' ? JSON.parse(user.profile_colors) : user.profile_colors) : {
          cover: '#fbae17',
          background: '#f5f5f5',
          containers: '#ffffff'
        },
        gamesList: user.games_list ? (typeof user.games_list === 'string' ? JSON.parse(user.games_list) : user.games_list) : [],
        collectionPhoto: user.collection_photo,
        favoriteCard: user.favorite_card,
        isAdmin: user.is_admin,
        levelProgress: {
          currentLevel,
          currentLevelName: levelNames[currentLevel as keyof typeof levelNames],
          currentXP,
          xpForNextLevel,
          progressPercentage
        },
        posts: [],
        galleryImages: []
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

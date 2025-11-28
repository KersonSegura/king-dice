import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getLevelProgress } from '@/lib/reputation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper function to convert old /uploads/ paths to Supabase Storage URLs
function rewriteStorageUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  
  // If already a full URL (Supabase Storage), return as is
  if (url.startsWith('http') && url.includes('.supabase.co')) {
    return url;
  }
  
  // Convert old /uploads/ paths to Supabase Storage URLs
  if (url.startsWith('/uploads/')) {
    const filename = url.replace('/uploads/', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    if (supabaseUrl) {
      return `${supabaseUrl}/storage/v1/object/public/uploads/uploads/${filename}`;
    }
  }
  
  return url;
}
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

    // Calculate level progress using the same function as level-progress route
    const levelProgress = await getLevelProgress(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio || '',
        favoriteGames: user.favoriteGames ? (typeof user.favoriteGames === 'string' ? JSON.parse(user.favoriteGames) : user.favoriteGames) : [],
        profileColors: user.profileColors ? (typeof user.profileColors === 'string' ? JSON.parse(user.profileColors) : user.profileColors) : {
          cover: '#fbae17',
          background: '#f5f5f5',
          containers: '#ffffff'
        },
        gamesList: user.gamesList ? (typeof user.gamesList === 'string' ? JSON.parse(user.gamesList) : user.gamesList) : [],
        collectionPhoto: rewriteStorageUrl(user.collectionPhoto),
        favoriteCard: rewriteStorageUrl(user.favoriteCard),
        isAdmin: user.isAdmin,
        levelProgress: {
          currentLevel: levelProgress.currentLevel,
          currentLevelName: levelProgress.currentLevelName,
          currentXP: levelProgress.currentXP,
          xpForNextLevel: levelProgress.xpForNextLevel,
          progressPercentage: levelProgress.progressPercentage
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

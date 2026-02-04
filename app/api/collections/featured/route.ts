import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    const limit = parseInt(searchParams.get('limit') || '3');

    // Fetch users who have collection photos and at least some games
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar, collectionPhoto, gamesList')
      .not('collectionPhoto', 'is', null)
      .not('gamesList', 'is', null)
      .order('createdAt', { ascending: false })
      .limit(limit * 3); // Fetch more to filter out empty collections

    if (error) {
      console.error('Error fetching featured collections:', error);
      return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
    }

    // Filter users who actually have games in their collection
    const usersWithCollections = (users || []).filter(user => {
      try {
        const gamesList = typeof user.gamesList === 'string' 
          ? JSON.parse(user.gamesList) 
          : user.gamesList;
        return Array.isArray(gamesList) && gamesList.length > 0;
      } catch {
        return false;
      }
    }).slice(0, limit);

    // Transform the data
    const collections = usersWithCollections.map(user => {
      try {
        const gamesList = typeof user.gamesList === 'string' 
          ? JSON.parse(user.gamesList) 
          : user.gamesList;
        
        return {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          collectionPhoto: rewriteStorageUrl(user.collectionPhoto),
          gameCount: Array.isArray(gamesList) ? gamesList.length : 0,
          // Get first game image as preview
          previewGameImage: Array.isArray(gamesList) && gamesList.length > 0 
            ? gamesList[0]?.image || null 
            : null
        };
      } catch {
        return {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          collectionPhoto: rewriteStorageUrl(user.collectionPhoto),
          gameCount: 0,
          previewGameImage: null
        };
      }
    });

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Error fetching featured collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}


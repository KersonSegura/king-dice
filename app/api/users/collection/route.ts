import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');

    if (!userId && !username) {
      return NextResponse.json({ error: 'User ID or username is required' }, { status: 400 });
    }

    // Build query based on userId or username
    let query = supabaseAdmin
      .from('users')
      .select('collectionPhoto, favoriteCard, gamesList');

    if (userId) {
      query = query.eq('id', userId);
    } else {
      query = query.eq('username', username!);
    }

    const { data: user, error } = await query.single();

    if (error || !user) {
      console.error('Error fetching collection data:', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse gamesList if it exists
    let gamesList = [];
    if (user.gamesList) {
      try {
        gamesList = typeof user.gamesList === 'string' 
          ? JSON.parse(user.gamesList) 
          : user.gamesList;
      } catch (e) {
        console.error('Error parsing gamesList:', e);
        gamesList = [];
      }
    }

    return NextResponse.json({
      success: true,
      collectionPhoto: user.collectionPhoto,
      favoriteCard: user.favoriteCard,
      gamesList: gamesList
    });
  } catch (error) {
    console.error('Error fetching collection data:', error);
    return NextResponse.json({ error: 'Failed to fetch collection data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, collectionPhoto, favoriteCard, gamesList } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    
    if (collectionPhoto !== undefined) {
      updateData.collectionPhoto = collectionPhoto;
    }
    
    if (favoriteCard !== undefined) {
      updateData.favoriteCard = favoriteCard;
    }
    
    if (gamesList !== undefined) {
      updateData.gamesList = JSON.stringify(gamesList);
    }

    // Update user in Supabase
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('collectionPhoto, favoriteCard, gamesList')
      .single();

    if (updateError || !updatedUser) {
      console.error('Error updating collection data:', updateError);
      return NextResponse.json({ error: 'Failed to update collection data' }, { status: 500 });
    }

    // Parse gamesList if it exists
    let parsedGamesList = [];
    if (updatedUser.gamesList) {
      try {
        parsedGamesList = typeof updatedUser.gamesList === 'string' 
          ? JSON.parse(updatedUser.gamesList) 
          : updatedUser.gamesList;
      } catch (e) {
        console.error('Error parsing gamesList:', e);
        parsedGamesList = [];
      }
    }

    return NextResponse.json({
      success: true,
      collectionPhoto: updatedUser.collectionPhoto,
      favoriteCard: updatedUser.favoriteCard,
      gamesList: parsedGamesList
    });
  } catch (error) {
    console.error('Error updating collection data:', error);
    return NextResponse.json({ error: 'Failed to update collection data' }, { status: 500 });
  }
}

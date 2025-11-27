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
      .select('collection_photo, favorite_card, games_list');

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

    // Parse games_list if it exists
    let gamesList = [];
    if (user.games_list) {
      try {
        gamesList = typeof user.games_list === 'string' 
          ? JSON.parse(user.games_list) 
          : user.games_list;
      } catch (e) {
        console.error('Error parsing games_list:', e);
        gamesList = [];
      }
    }

    return NextResponse.json({
      success: true,
      collectionPhoto: user.collection_photo,
      favoriteCard: user.favorite_card,
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
      updateData.collection_photo = collectionPhoto;
    }
    
    if (favoriteCard !== undefined) {
      updateData.favorite_card = favoriteCard;
    }
    
    if (gamesList !== undefined) {
      updateData.games_list = JSON.stringify(gamesList);
    }

    // Update user in Supabase
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('collection_photo, favorite_card, games_list')
      .single();

    if (updateError || !updatedUser) {
      console.error('Error updating collection data:', updateError);
      return NextResponse.json({ error: 'Failed to update collection data' }, { status: 500 });
    }

    // Parse games_list if it exists
    let parsedGamesList = [];
    if (updatedUser.games_list) {
      try {
        parsedGamesList = typeof updatedUser.games_list === 'string' 
          ? JSON.parse(updatedUser.games_list) 
          : updatedUser.games_list;
      } catch (e) {
        console.error('Error parsing games_list:', e);
        parsedGamesList = [];
      }
    }

    return NextResponse.json({
      success: true,
      collectionPhoto: updatedUser.collection_photo,
      favoriteCard: updatedUser.favorite_card,
      gamesList: parsedGamesList
    });
  } catch (error) {
    console.error('Error updating collection data:', error);
    return NextResponse.json({ error: 'Failed to update collection data' }, { status: 500 });
  }
}

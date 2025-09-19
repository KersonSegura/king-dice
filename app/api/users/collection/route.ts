import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        collectionPhoto: true,
        favoriteCard: true,
        gamesList: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      collectionPhoto: user.collectionPhoto,
      favoriteCard: user.favoriteCard,
      gamesList: user.gamesList ? JSON.parse(user.gamesList) : []
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

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        collectionPhoto: true,
        favoriteCard: true,
        gamesList: true
      }
    });

    return NextResponse.json({
      success: true,
      collectionPhoto: user.collectionPhoto,
      favoriteCard: user.favoriteCard,
      gamesList: user.gamesList ? JSON.parse(user.gamesList) : []
    });
  } catch (error) {
    console.error('Error updating collection data:', error);
    return NextResponse.json({ error: 'Failed to update collection data' }, { status: 500 });
  }
}

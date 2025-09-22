import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user profile colors
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileColors: true }
    });

    // If user doesn't exist, return default colors instead of 404
    if (!user) {
      const defaultColors = {
        cover: '#fbae17',
        background: '#f5f5f5',
        containers: '#ffffff'
      };
      
      return NextResponse.json({
        success: true,
        colors: defaultColors
      });
    }

    // Return default colors if none are set
    const defaultColors = {
      cover: '#fbae17',
      background: '#f5f5f5',
      containers: '#ffffff'
    };

    let colors = defaultColors;
    if (user.profileColors) {
      try {
        colors = JSON.parse(user.profileColors);
      } catch (error) {
        console.error('Error parsing profile colors:', error);
        colors = defaultColors;
      }
    }

    return NextResponse.json({
      success: true,
      colors: colors
    });

  } catch (error) {
    console.error('Error fetching profile colors:', error);
    return NextResponse.json(
      { message: 'Failed to fetch profile colors' },
      { status: 500 }
    );
  }
}

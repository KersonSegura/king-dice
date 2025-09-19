import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, colors } = await request.json();

    if (!userId || !colors) {
      return NextResponse.json(
        { message: 'User ID and colors are required' },
        { status: 400 }
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

    // Update or create user profile colors (store as JSON string)
    const colorsJson = JSON.stringify({ cover, background, containers });
    
    // First, try to find the user
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      // User doesn't exist in database, create a basic user record
      user = await prisma.user.create({
        data: {
          id: userId,
          username: 'User', // Default username, will be updated when user logs in properly
          email: 'user@example.com', // Default email
          password: '', // Empty password for now
          profileColors: colorsJson
        }
      });
    } else {
      // User exists, update their colors
      user = await prisma.user.update({
        where: { id: userId },
        data: {
          profileColors: colorsJson
        }
      });
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

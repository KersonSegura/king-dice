import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isUserAdmin } from '@/lib/admin-utils';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, username, email, bio, favoriteGames } = await request.json();
    
    console.log('Received update profile request:', {
      userId,
      username,
      email,
      bio,
      favoriteGames
    });

    // Validate input
    if (!userId || !username || !email) {
      return NextResponse.json(
        { message: 'User ID, username, and email are required' },
        { status: 400 }
      );
    }

    // Validate username length
    if (username.length < 3) {
      return NextResponse.json(
        { message: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Get current user or create if doesn't exist
    let currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      // Check if username contains KingDice variations to set admin status
      const containsKingDiceVariation = (username: string) => {
        const variations = ['kingdice', 'king dice', 'king-dice', 'king_dice'];
        return variations.some(variation => 
          username.toLowerCase().includes(variation)
        );
      };

      const isAdmin = containsKingDiceVariation(username);

      // User doesn't exist in database, create a basic user record
      currentUser = await prisma.user.create({
        data: {
          id: userId,
          username: username,
          email: email,
          password: '', // Empty password for now
          isAdmin: isAdmin,
          bio: bio || null,
          favoriteGames: favoriteGames ? JSON.stringify(favoriteGames) : null
        }
      });
      
      return NextResponse.json({
        success: true,
        user: currentUser,
        message: 'Profile created successfully'
      });
    }

    // Check for KingDice variations to determine admin status
    // Check if user should be admin based on config
    const isAdmin = isUserAdmin(userId, username, email);

    // Only check for existing usernames/emails if user is not admin
    if (!isAdmin) {
      // Check if username already exists (excluding current user)
      const existingUserByUsername = await prisma.user.findUnique({
        where: { username: username }
      });
      if (existingUserByUsername && existingUserByUsername.id !== userId) {
        return NextResponse.json(
          { message: 'Username already exists' },
          { status: 400 }
        );
      }

      // Check if email already exists (excluding current user)
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: email }
      });
      if (existingUserByEmail && existingUserByEmail.id !== userId) {
        return NextResponse.json(
          { message: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      username,
      email,
      isAdmin: isAdmin // Update admin status
    };

    // Add bio if provided
    if (bio !== undefined) {
      updateData.bio = bio;
    }

    // Add favorite games if provided (store as JSON string)
    if (favoriteGames !== undefined) {
      updateData.favoriteGames = JSON.stringify(favoriteGames);
    }

    // Update or create user profile
    let updatedUser;
    try {
      console.log('Attempting to update user:', userId, 'with data:', updateData);
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
      console.log('User updated successfully:', updatedUser);
    } catch (error) {
      console.error('Update failed, error:', error);
      // If update fails, try to create the user
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        console.log('User not found, creating new user...');
        updatedUser = await prisma.user.create({
          data: {
            id: userId,
            username,
            email,
            password: '', // Empty password for now
            isAdmin: isAdmin,
            bio: bio || null,
            favoriteGames: favoriteGames ? JSON.stringify(favoriteGames) : null,
            profileColors: null
          }
        });
        console.log('User created successfully:', updatedUser);
      } else {
        console.error('Update failed with error:', error);
        throw error; // Re-throw if it's a different error
      }
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to update profile';
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        errorMessage = 'Username or email already exists';
      } else if (error.message.includes('Record to update not found')) {
        errorMessage = 'User not found in database';
      } else {
        errorMessage = `Database error: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isUserAdmin } from '@/lib/admin-utils';
import { getUserFromToken } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Check authentication first
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and get authenticated user
    const authResult = await getUserFromToken(token);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { message: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const authenticatedUser = authResult.user;
    const { userId, username, email, bio, favoriteGames, profileColors, collectionPhoto, favoriteCard, gamesList } = await request.json();
    
    console.log('Received update profile request:', {
      userId,
      username,
      email,
      bio,
      favoriteGames,
      profileColors,
      collectionPhoto,
      favoriteCard,
      gamesList
    });

    // Validate input
    if (!userId || !username || !email) {
      return NextResponse.json(
        { message: 'User ID, username, and email are required' },
        { status: 400 }
      );
    }

    // SECURITY: Only allow users to update their own profile, unless they're admin
    const isAdmin = authenticatedUser.isAdmin || isUserAdmin(authenticatedUser.id, authenticatedUser.username, authenticatedUser.email);
    
    if (userId !== authenticatedUser.id && !isAdmin) {
      return NextResponse.json(
        { message: 'Forbidden - You can only update your own profile' },
        { status: 403 }
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
    const { data: currentUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (findError || !currentUser) {
      // Check if username contains KingDice variations to set admin status
      const containsKingDiceVariation = (username: string) => {
        const variations = ['kingdice', 'king dice', 'king-dice', 'king_dice'];
        return variations.some(variation => 
          username.toLowerCase().includes(variation)
        );
      };

      const isAdmin = containsKingDiceVariation(username);

      // User doesn't exist in database, create a basic user record
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          username: username,
          email: email,
          password_hash: '',
          isAdmin: isAdmin,
          bio: bio || null,
          favoriteGames: favoriteGames ? JSON.stringify(favoriteGames) : null,
          collectionPhoto: collectionPhoto || null,
          favoriteCard: favoriteCard || null
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { message: 'Failed to create profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        user: newUser,
        message: 'Profile created successfully'
      });
    }

    // Check for KingDice variations to determine admin status
    // Check if user should be admin based on config
    const userShouldBeAdmin = isUserAdmin(userId, username, email);

    // Only check for existing usernames/emails if user is not admin
    if (!userShouldBeAdmin) {
      // Check if username already exists (excluding current user)
      const { data: existingUserByUsername } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .single();

      if (existingUserByUsername) {
        return NextResponse.json(
          { message: 'Username already exists' },
          { status: 400 }
        );
      }

      // Check if email already exists (excluding current user)
      const { data: existingUserByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .single();

      if (existingUserByEmail) {
        return NextResponse.json(
          { message: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      username,
      email,
      isAdmin: userShouldBeAdmin
    };

    // Add bio if provided
    if (bio !== undefined) {
      updateData.bio = bio;
    }

    // Add favorite games if provided (store as JSON string)
    if (favoriteGames !== undefined) {
      updateData.favoriteGames = JSON.stringify(favoriteGames);
    }

    // Add profile colors if provided (store as JSON string)
    if (profileColors !== undefined) {
      updateData.profileColors = JSON.stringify(profileColors);
    }

    // Add collection photo if provided
    if (collectionPhoto !== undefined) {
      updateData.collectionPhoto = collectionPhoto;
    }

    // Add favorite card if provided
    if (favoriteCard !== undefined) {
      updateData.favoriteCard = favoriteCard;
    }

    // Add games list if provided (store as JSON string)
    if (gamesList !== undefined) {
      updateData.gamesList = JSON.stringify(gamesList);
    }

    // Update user profile
    let updatedUser;
    try {
      console.log('Attempting to update user:', userId, 'with data:', updateData);
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Update failed, error:', updateError);
        console.error('Error details:', JSON.stringify(updateError, null, 2));
        // If update fails (user not found), try to create the user
        if (updateError.message?.includes('0 rows') || updateError.code === 'PGRST116' || updateError.message?.includes('PGRST116')) {
          console.log('User not found, creating new user...');
          const { data: created, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
              id: userId,
              username,
              email,
              password_hash: '',
              isAdmin: userShouldBeAdmin,
              bio: bio || null,
              favoriteGames: favoriteGames ? JSON.stringify(favoriteGames) : null,
              profileColors: profileColors ? JSON.stringify(profileColors) : null,
              collectionPhoto: collectionPhoto || null,
              favoriteCard: favoriteCard || null,
              gamesList: gamesList ? JSON.stringify(gamesList) : null
            })
            .select()
            .single();

          if (createError || !created) {
            console.error('Create failed:', createError);
            throw createError || new Error('Failed to create user');
          }
          updatedUser = created;
          console.log('User created successfully:', updatedUser);
        } else {
          throw updateError;
        }
      } else {
        updatedUser = updated;
        console.log('User updated successfully:', updatedUser);
      }
    } catch (error) {
      console.error('Error in update/create:', error);
      throw error; // Re-throw for outer catch
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
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        errorMessage = 'Username or email already exists';
      } else if (error.message.includes('0 rows') || error.message.includes('PGRST116')) {
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

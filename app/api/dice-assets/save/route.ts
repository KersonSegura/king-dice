import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Check authentication first
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and get authenticated user
    const authResult = await getUserFromToken(token);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const authenticatedUser = authResult.user;
    const { userId, diceConfig, profileImageUrl, username } = await request.json();
    
    console.log('💾 Saving dice configuration for user:', userId);
    console.log('🎲 Dice config:', diceConfig);
    console.log('🖼️ Profile image URL:', profileImageUrl);
    console.log('👤 Username:', username);
    
    // Validate the request
    if (!userId || !diceConfig || !profileImageUrl) {
      return NextResponse.json(
        { error: 'Missing userId, diceConfig, or profileImageUrl' },
        { status: 400 }
      );
    }

    // SECURITY: Only allow users to update their own avatar and title
    if (userId !== authenticatedUser.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own avatar and title' },
        { status: 403 }
      );
    }
    
    // Find user in database using Supabase
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, username, email, avatar, title, isAdmin, level, xp')
      .eq('id', userId)
      .single();
    
    if (findError || !user) {
      console.log('❌ User not found by ID:', userId, findError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Found user:', user.username);
    
    // Extract title from diceConfig and convert file path to title name
    const selectedTitle = diceConfig.title;
    console.log('👑 Selected title (file path):', selectedTitle);
    
    // Extract title name from file path (e.g., "/dice/Titles/Knight.svg" -> "Knight")
    let titleName = selectedTitle;
    if (selectedTitle && selectedTitle.includes('/dice/Titles/')) {
      const pathParts = selectedTitle.split('/');
      const filename = pathParts[pathParts.length - 1]; // Get "Knight.svg"
      titleName = filename.replace('.svg', ''); // Get "Knight"
    }
    console.log('👑 Extracted title name:', titleName);
    
    // Update the user's avatar and title in the database using Supabase
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        avatar: profileImageUrl,
        title: selectedTitle ? titleName : null
      })
      .eq('id', user.id)
      .select('id, username, email, avatar, title, isAdmin, level, xp')
      .single();
    
    if (updateError || !updatedUser) {
      console.error('❌ Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }
    
    // Map Supabase response to match expected format
    const formattedUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      title: updatedUser.title,
      isAdmin: updatedUser.isAdmin,
      level: updatedUser.level,
      xp: updatedUser.xp
    };
    
    console.log('✅ User avatar updated in database:', formattedUser.avatar);
    console.log('✅ User title updated in database:', formattedUser.title);
    console.log('✅ Dice configuration saved successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Dice configuration saved successfully',
      profileImageUrl,
      diceConfig,
      updatedUser: formattedUser
    });
    
  } catch (error) {
    console.error('❌ Error saving dice configuration:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

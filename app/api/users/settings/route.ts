import { NextRequest, NextResponse } from 'next/server';
import { updateUserSettings, getUserSettings } from '@/lib/user-settings';
import { getUserFromToken } from '@/lib/auth';


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Check authentication
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Only allow users to view their own settings
    if (userId !== authenticatedUser.id) {
      return NextResponse.json(
        { message: 'Forbidden - You can only view your own settings' },
        { status: 403 }
      );
    }

    const settings = getUserSettings(userId);
    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Check authentication
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
    const { userId, settings } = await request.json();

    if (!userId || !settings) {
      return NextResponse.json(
        { message: 'User ID and settings are required' },
        { status: 400 }
      );
    }

    // SECURITY: Only allow users to update their own settings
    if (userId !== authenticatedUser.id) {
      return NextResponse.json(
        { message: 'Forbidden - You can only update your own settings' },
        { status: 403 }
      );
    }

    const updatedSettings = updateUserSettings(userId, settings);
    
    if (!updatedSettings) {
      return NextResponse.json(
        { message: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

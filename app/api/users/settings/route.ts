import { NextRequest, NextResponse } from 'next/server';
import { updateUserSettings, getUserSettings } from '@/lib/user-settings';

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
    const { userId, settings } = await request.json();

    if (!userId || !settings) {
      return NextResponse.json(
        { message: 'User ID and settings are required' },
        { status: 400 }
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

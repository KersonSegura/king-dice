import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'notifications.json');

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

    let notifications = [];
    
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
      const allNotifications = JSON.parse(data);
      notifications = allNotifications.filter((n: any) => n.userId === userId);
    }

    return NextResponse.json({ notifications });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, type, message, title } = await request.json();

    if (!userId || !type || !message) {
      return NextResponse.json(
        { message: 'User ID, type, and message are required' },
        { status: 400 }
      );
    }

    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      message,
      title: title || 'King Dice',
      timestamp: new Date().toISOString(),
      read: false
    };

    let notifications = [];
    
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
      notifications = JSON.parse(data);
    }
    
    notifications.unshift(notification);
    notifications = notifications.slice(0, 100); // Keep only last 100 notifications
    
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
    
    return NextResponse.json({
      success: true,
      notification,
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { message: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

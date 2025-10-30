import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    // Followers (someone followed you)
    const { data: follows } = await supabaseAdmin
      .from('follows')
      .select(`id, follower_id, following_id, created_at,
               follower:users!follows_follower_id_fkey(id, username, avatar)`) 
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Follow requests (if using private mode)
    const { data: followRequests } = await supabaseAdmin
      .from('follow_requests')
      .select(`id, requester_id, target_id, status, created_at,
               requester:users!follow_requests_requester_id_fkey(id, username, avatar)`) 
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const notifications = [
      ...(follows || []).map((f: any) => ({
        id: `follow:${f.id}`,
        type: 'follow' as const,
        title: `${f.follower?.username || 'Someone'} followed you`,
        actor: f.follower,
        createdAt: f.created_at
      })),
      ...(followRequests || []).map((r: any) => ({
        id: `follow_request:${r.id}`,
        type: 'follow_request' as const,
        title: `${r.requester?.username || 'Someone'} requested to follow you`,
        actor: r.requester,
        createdAt: r.created_at,
        status: r.status
      }))
    ]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

    return NextResponse.json({ notifications });
  } catch (e) {
    console.error('Error fetching notifications:', e);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'notifications.json');


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

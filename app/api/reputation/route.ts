import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserXP, 
  getAllUsersXP, 
  getTopUsersByXP, 
  getUserXPHistory,
  awardXP,
  canPerformDailyLogin,
  getLevelProgress
} from '@/lib/reputation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    if (action === 'top') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const topUsers = getTopUsersByXP(limit);
      return NextResponse.json({ users: topUsers });
    }

    if (action === 'history' && userId) {
      const limit = parseInt(searchParams.get('limit') || '50');
      const history = getUserXPHistory(userId, limit);
      return NextResponse.json({ history });
    }

    if (action === 'progress' && userId) {
      const progress = getLevelProgress(userId);
      return NextResponse.json({ progress });
    }

    if (action === 'canLogin' && userId) {
      const canLogin = canPerformDailyLogin(userId);
      return NextResponse.json({ canLogin });
    }

    if (userId) {
      const userXP = getUserXP(userId);
      if (!userXP) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ user: userXP });
    }

    // Return all users if no specific user requested
    const allUsers = getAllUsersXP();
    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error('Error fetching XP data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch XP data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, username, action, relatedId } = await request.json();
    
    if (!userId || !username || !action) {
      return NextResponse.json(
        { error: 'User ID, username, and action are required' },
        { status: 400 }
      );
    }

    const result = awardXP(userId, username, action, relatedId);
    
    if (!result.userXP) {
      return NextResponse.json(
        { error: 'Failed to award XP' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      user: result.userXP,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      message: 'XP awarded successfully'
    });
  } catch (error) {
    console.error('Error awarding XP:', error);
    return NextResponse.json(
      { error: 'Failed to award XP' },
      { status: 500 }
    );
  }
}

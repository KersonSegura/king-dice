import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}


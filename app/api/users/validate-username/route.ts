import { NextRequest, NextResponse } from 'next/server';
import { validateUsername } from '@/lib/username-validation';

export const dynamic = 'force-dynamic';

/**
 * GET - Validate if a username is available and acceptable
 * Query params: username (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { valid: false, reason: 'Username is required' },
        { status: 400 }
      );
    }

    const validation = await validateUsername(username);
    
    return NextResponse.json({
      valid: validation.valid,
      reason: validation.reason
    });
  } catch (error) {
    console.error('Error validating username:', error);
    return NextResponse.json(
      { valid: false, reason: 'Error validating username. Please try again.' },
      { status: 500 }
    );
  }
}


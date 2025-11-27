import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('profileColors')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error loading user:', userError);
      return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
    }

    // Try to parse dice config from profileColors field
    if (user && user.profileColors) {
      try {
        const parsed = JSON.parse(user.profileColors);
        // Check for diceConfig in the merged data
        if (parsed.diceConfig) {
          return NextResponse.json({ 
            config: parsed.diceConfig,
            updatedAt: parsed.diceConfigUpdatedAt || parsed.updatedAt
          });
        }
      } catch (parseError) {
        // profile_colors might be used for actual colors, not dice config
        console.log('⚠️ profile_colors is not valid JSON or doesn\'t contain dice config, using defaults');
      }
    }

    // Return default configuration for new users or if no config found
    const defaultConfig = {
      background: "/dice/backgrounds/WhiteBackground.svg",
      dice: "/dice/dice/WhiteDice.svg",
      pattern: "/dice/patterns/1-2-3.svg",
      accessories: null,
      hat: null,
      item: null,
      companion: null,
      title: null
    };
    
    return NextResponse.json({ 
      config: defaultConfig,
      updatedAt: null
    });
  } catch (error) {
    console.error('Error loading dice configuration:', error);
    return NextResponse.json({ 
      error: 'Failed to load dice configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

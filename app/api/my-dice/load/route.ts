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

    // Get user from database - try both camelCase and snake_case
    let user: any = null;
    let userError: any = null;

    // Try camelCase first
    const { data: userCamel, error: errorCamel } = await supabaseAdmin
      .from('users')
      .select('profileColors')
      .eq('id', userId)
      .single();

    if (!errorCamel && userCamel) {
      user = userCamel;
    } else {
      // Try snake_case
      const { data: userSnake, error: errorSnake } = await supabaseAdmin
        .from('users')
        .select('profile_colors')
        .eq('id', userId)
        .single();

      if (!errorSnake && userSnake) {
        user = { profileColors: userSnake.profile_colors };
      } else {
        userError = errorSnake || errorCamel;
      }
    }

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error loading user:', userError);
      return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
    }

    // Try to parse dice config from profileColors field
    const profileColorsData = user?.profileColors;
    if (profileColorsData) {
      try {
        // Handle both string and object formats
        const parsed = typeof profileColorsData === 'string' 
          ? JSON.parse(profileColorsData) 
          : profileColorsData;
        
        console.log('📂 Parsed profileColors:', parsed);
        
        // Check for diceConfig in the merged data
        if (parsed.diceConfig) {
          console.log('✅ Found diceConfig:', parsed.diceConfig);
          return NextResponse.json({ 
            config: parsed.diceConfig,
            updatedAt: parsed.diceConfigUpdatedAt || parsed.updatedAt
          });
        } else {
          console.log('⚠️ No diceConfig found in profileColors');
        }
      } catch (parseError) {
        // profile_colors might be used for actual colors, not dice config
        console.log('⚠️ profile_colors is not valid JSON or doesn\'t contain dice config:', parseError);
      }
    } else {
      console.log('⚠️ No profileColors data found for user');
    }

    // Return null config for new users so defaults can be applied on client side
    return NextResponse.json({ 
      config: null,
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

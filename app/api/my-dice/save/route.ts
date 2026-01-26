import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface SavePayload {
  userId: string;
  config: Record<string, string | null>;
}

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
    const body = (await request.json()) as SavePayload;
    if (!body || !body.userId || !body.config) {
      return NextResponse.json({ error: 'Missing userId or config' }, { status: 400 });
    }

    // SECURITY: Only allow users to save their own dice config
    if (body.userId !== authenticatedUser.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only save your own dice configuration' },
        { status: 403 }
      );
    }

    console.log('💾 Saving dice config for user:', body.userId);

    // Get existing user data including profileColors
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, profileColors')
      .eq('id', body.userId)
      .single();

    if (findError) {
      console.error('❌ Error finding user:', findError);
      return NextResponse.json({ 
        error: 'User not found',
        details: findError.message 
      }, { status: 404 });
    }

    if (!user) {
      console.error('❌ User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Merge dice config with existing profile_colors if it exists
    let mergedData: any = {
      diceConfig: body.config,
      updatedAt: new Date().toISOString()
    };

    // If profileColors exists and contains profile colors data, preserve it
    if (user.profileColors) {
      try {
        const existing = JSON.parse(user.profileColors);
        // Check if it's profile colors format (has cover, background, containers)
        if (existing.cover || existing.background || existing.containers) {
          // It's profile colors, merge both
          mergedData = {
            ...existing,
            diceConfig: body.config,
            diceConfigUpdatedAt: new Date().toISOString()
          };
        } else if (existing.diceConfig) {
          // It already has dice config, just update it
          mergedData = {
            ...existing,
            diceConfig: body.config,
            updatedAt: new Date().toISOString()
          };
        }
      } catch (parseError) {
        // profile_colors is not valid JSON, just store dice config
        console.log('⚠️ profile_colors is not valid JSON, overwriting with dice config');
      }
    }

    const mergedJson = JSON.stringify(mergedData);
    console.log('💾 Merged data to save:', mergedJson.substring(0, 100) + '...');

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        profileColors: mergedJson 
      })
      .eq('id', body.userId);

    if (updateError) {
      console.error('❌ Error saving dice config:', updateError);
      return NextResponse.json({ 
        error: 'Failed to save dice config',
        details: updateError.message,
        code: updateError.code
      }, { status: 500 });
    }

    console.log('✅ Dice config saved successfully');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Error in save route:', error);
    return NextResponse.json({ 
      error: 'Failed to save dice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface SavePayload {
  userId: string;
  config: Record<string, string | null>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SavePayload;
    if (!body || !body.userId || !body.config) {
      return NextResponse.json({ error: 'Missing userId or config' }, { status: 400 });
    }

    // Store dice config in Supabase users table
    // Use profile_colors field or create a new dice_config field
    // For now, we'll store it in a JSON field in the users table
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', body.userId)
      .single();

    if (findError || !user) {
      console.error('User not found:', findError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Store dice config as JSON in profile_colors field (or we could add a dice_config field)
    // For now, using a workaround: store in profile_colors as JSON
    const diceConfigJson = JSON.stringify({
      diceConfig: body.config,
      updatedAt: new Date().toISOString()
    });

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        profile_colors: diceConfigJson 
      })
      .eq('id', body.userId);

    if (updateError) {
      console.error('Error saving dice config:', updateError);
      return NextResponse.json({ error: 'Failed to save dice config' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in save route:', error);
    return NextResponse.json({ 
      error: 'Failed to save dice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const query = supabaseAdmin
      .from('game_rules')
      .select(`
        id, gameId, language, rulesText, rulesHtml, setupInstructions, victoryConditions,
        game:games(
          id, name, nameEn, image, year, minPlayers, maxPlayers, durationMinutes
        )
      `)
      .order('name', { ascending: true, referencedTable: 'games' })
      .range(offset, offset + limit - 1);

    const { data: rules, error } = search
      ? await query.ilike('game.name', `%${search}%`)
      : await query;

    if (error) {
      console.error('Error querying rules:', error);
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      // If JSON parsing fails, it might be due to body size limit
      console.error('Error parsing JSON in rules POST:', jsonError);
      return NextResponse.json(
        { error: 'Request body is too large or invalid. Vercel has a 4.5MB limit. Please reduce the size of the rules text.' },
        { status: 413 }
      );
    }

    const insertPayload = {
      gameId: body.gameId,
      language: body.language || 'es',
      rulesText: body.rulesText || '',
      rulesHtml: body.rulesHtml || '',
      setupInstructions: body.setupInstructions ?? null,
      victoryConditions: body.victoryConditions ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from('game_rules')
      .insert(insertPayload)
      .select(`
        id, gameId, language, rulesText, rulesHtml, setupInstructions, victoryConditions,
        game:games(
          id, name, nameEn, nameEs, year, yearRelease, image, imageUrl, minPlayers, maxPlayers, durationMinutes
        )
      `)
      .single();

    if (error) {
      console.error('Error creating rule:', error);
      const errorMessage = error.message || 'Failed to create rule';
      // Check for specific error types
      if (error.message?.includes('too large') || error.message?.includes('size')) {
        return NextResponse.json(
          { error: 'Rules text is too large. Vercel has a 4.5MB limit. Please reduce the size of the rules text.' },
          { status: 413 }
        );
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating rule:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create rule';
    // Check if it's a body size issue
    if (errorMessage.includes('too large') || errorMessage.includes('Request Entity Too Large')) {
      return NextResponse.json(
        { error: 'Rules text is too large. Vercel has a 4.5MB limit. Please reduce the size of the rules text.' },
        { status: 413 }
      );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

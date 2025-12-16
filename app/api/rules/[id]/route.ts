import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      // If JSON parsing fails, it might be due to body size limit
      console.error('Error parsing JSON in rules PUT:', jsonError);
      return NextResponse.json(
        { error: 'Request body is too large or invalid. Vercel has a 4.5MB limit. Please reduce the size of the rules text.' },
        { status: 413 }
      );
    }

    // Prepare update data - handle both camelCase and snake_case
    const updateData: any = {};
    if (body.language !== undefined) updateData.language = body.language;
    if (body.rulesText !== undefined) updateData.rulesText = body.rulesText;
    if (body.rulesHtml !== undefined) updateData.rulesHtml = body.rulesHtml;
    if (body.setupInstructions !== undefined) updateData.setupInstructions = body.setupInstructions;
    if (body.victoryConditions !== undefined) updateData.victoryConditions = body.victoryConditions;

    // Update the rule
    const { data: updatedRule, error: updateError } = await supabaseAdmin
      .from('game_rules')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, gameId, language, rulesText, rulesHtml, setupInstructions, victoryConditions,
        game:games(
          id, name, nameEn, nameEs, year, yearRelease, image, imageUrl, minPlayers, maxPlayers, durationMinutes
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating rule:', updateError);
      const errorMessage = updateError.message || 'Failed to update rule';
      // Check if it's a body size issue
      if (errorMessage.includes('too large') || errorMessage.includes('Request Entity Too Large')) {
        return NextResponse.json(
          { error: 'Rules text is too large. Vercel has a 4.5MB limit. Please reduce the size of the rules text.' },
          { status: 413 }
        );
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    if (!updatedRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Error updating rule:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update rule';
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    const { error: deleteError } = await supabaseAdmin
      .from('game_rules')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting rule:', deleteError);
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}


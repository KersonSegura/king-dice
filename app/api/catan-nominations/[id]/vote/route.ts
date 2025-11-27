import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await request.json();
    const { id: idString } = await params;
    const nominationId = parseInt(idString);
    
    if (isNaN(nominationId)) {
      return NextResponse.json(
        { error: 'Invalid nomination ID' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has already voted for this nomination
    // Try camelCase first, then snake_case
    let existingVote: any = null;
    
    const { data: voteCamel, error: voteErrorCamel } = await supabaseAdmin
      .from('catan_nomination_votes')
      .select('id, nominationId, userId')
      .eq('nominationId', nominationId)
      .eq('userId', userId)
      .maybeSingle();

    if (!voteErrorCamel && voteCamel) {
      existingVote = voteCamel;
    } else {
      // Try snake_case
      const { data: voteSnake, error: voteErrorSnake } = await supabaseAdmin
        .from('catan_nomination_votes')
        .select('id, nomination_id, user_id')
        .eq('nomination_id', nominationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!voteErrorSnake && voteSnake) {
        existingVote = voteSnake;
      }
    }

    if (existingVote) {
      // User has already voted - remove the vote
      // Try camelCase first
      const { error: deleteErrorCamel } = await supabaseAdmin
        .from('catan_nomination_votes')
        .delete()
        .eq('nominationId', nominationId)
        .eq('userId', userId);

      if (deleteErrorCamel) {
        // Try snake_case
        await supabaseAdmin
          .from('catan_nomination_votes')
          .delete()
          .eq('nomination_id', nominationId)
          .eq('user_id', userId);
      }

      // Decrease the nomination's vote count
      // Get current votes first
      const { data: nomData, error: nomError } = await supabaseAdmin
        .from('catan_nominations')
        .select('votes')
        .eq('id', nominationId)
        .single();

      if (!nomError && nomData) {
        const newVotes = (nomData.votes || 0) - 1;
        await supabaseAdmin
          .from('catan_nominations')
          .update({ votes: newVotes })
          .eq('id', nominationId);

        return NextResponse.json({
          success: true,
          action: 'removed',
          nominationId: nominationId,
          votes: newVotes
        });
      }
    } else {
      // User hasn't voted - create the vote
      // Try camelCase first
      const { error: insertErrorCamel } = await supabaseAdmin
        .from('catan_nomination_votes')
        .insert({
          nominationId: nominationId,
          userId: userId
        });

      if (insertErrorCamel) {
        // Try snake_case
        await supabaseAdmin
          .from('catan_nomination_votes')
          .insert({
            nomination_id: nominationId,
            user_id: userId
          });
      }

      // Increase the nomination's vote count
      // Get current votes first
      const { data: nomData, error: nomError } = await supabaseAdmin
        .from('catan_nominations')
        .select('votes')
        .eq('id', nominationId)
        .single();

      if (!nomError && nomData) {
        const newVotes = (nomData.votes || 0) + 1;
        await supabaseAdmin
          .from('catan_nominations')
          .update({ votes: newVotes })
          .eq('id', nominationId);

        return NextResponse.json({
          success: true,
          action: 'added',
          nominationId: nominationId,
          votes: newVotes
        });
      }
    }

    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Error updating vote:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update vote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

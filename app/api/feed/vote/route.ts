import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST: Upvote/Downvote a post (only once per user)
export async function POST(request: NextRequest) {
  try {
    const { itemId, voteType } = await request.json();
    // Auth: either from header or cookie (update to your real auth mechanism)
    const userId = request.headers.get('user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!itemId || !['up','down'].includes(voteType)) {
      return NextResponse.json({ error: 'Item ID and valid vote type required' }, { status: 400 });
    }
    
    // 1. Lookup for existing vote
    let { data: existingVote } = await supabaseAdmin
      .from('post_votes')
      .select('id, vote_type')
      .match({ user_id: userId, post_id: itemId })
      .maybeSingle();
    
    let action: 'add' | 'remove' | 'swap' = 'add';
    if (existingVote && existingVote.vote_type === voteType) {
      // Unlike (remove vote)
      await supabaseAdmin.from('post_votes').delete().eq('id', existingVote.id);
      action = 'remove';
    } else if (existingVote) {
      // Change vote type (swap up <-> down)
      await supabaseAdmin.from('post_votes').update({ vote_type: voteType }).eq('id', existingVote.id);
      action = 'swap';
    } else {
      // Insert new vote
      await supabaseAdmin.from('post_votes').insert({ user_id: userId, post_id: itemId, vote_type: voteType });
      action = 'add';
    }

    // 2. Totals: count upvotes and downvotes
    const [{ count: upvotes }, { count: downvotes }] = await Promise.all([
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: itemId, vote_type: 'up' }),
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: itemId, vote_type: 'down' }),
    ]);
    
    // 3. Return the results, update userVote for UI
    return NextResponse.json({
      votes: { upvotes, downvotes },
      userVote: action === 'remove' ? null : voteType,
    });
  } catch (error) {
    console.error('Error voting on feed item:', error);
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}

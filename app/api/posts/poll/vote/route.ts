import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function parsePoll(raw: any) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { postId, optionId, userId } = await request.json();

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Post ID and user ID are required' }, { status: 400 });
    }

    const normalizedOptionId = optionId === null || optionId === undefined ? null : String(optionId);

    const { data: dbPost, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !dbPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postType = (dbPost.postType ?? dbPost.post_type ?? 'text') as string;
    const poll = parsePoll(dbPost.poll);

    if (postType !== 'poll' || !poll?.options?.length) {
      return NextResponse.json({ error: 'Post is not a poll' }, { status: 400 });
    }

    if (normalizedOptionId) {
      const valid = (poll.options || []).some((o: any) => String(o?.id) === normalizedOptionId);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid poll option' }, { status: 400 });
      }
    }

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from('post_poll_votes')
      .select('id, option_id')
      .match({ user_id: userId, post_id: postId })
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingError) {
      return NextResponse.json({ error: 'Failed to check existing vote', details: existingError.message }, { status: 500 });
    }

    const existing = existingRows?.[0] ?? null;

    if (!normalizedOptionId) {
      // remove vote
      if (existing?.id) {
        const { error } = await supabaseAdmin.from('post_poll_votes').delete().eq('id', existing.id);
        if (error) {
          return NextResponse.json({ error: 'Failed to remove vote', details: error.message }, { status: 500 });
        }
      }
    } else if (!existing) {
      const { error } = await supabaseAdmin
        .from('post_poll_votes')
        .insert({ user_id: userId, post_id: postId, option_id: normalizedOptionId });
      if (error) {
        return NextResponse.json({ error: 'Failed to cast vote', details: error.message }, { status: 500 });
      }
    } else if (String(existing.option_id) !== normalizedOptionId) {
      const { error } = await supabaseAdmin
        .from('post_poll_votes')
        .update({ option_id: normalizedOptionId, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) {
        return NextResponse.json({ error: 'Failed to update vote', details: error.message }, { status: 500 });
      }
    } else {
      // clicking the same option toggles off
      const { error } = await supabaseAdmin.from('post_poll_votes').delete().eq('id', existing.id);
      if (error) {
        return NextResponse.json({ error: 'Failed to remove vote', details: error.message }, { status: 500 });
      }
    }

    const { data: voteRows, error: votesError } = await supabaseAdmin
      .from('post_poll_votes')
      .select('option_id, user_id')
      .eq('post_id', postId);

    if (votesError) {
      return NextResponse.json({ error: 'Failed to fetch poll results', details: votesError.message }, { status: 500 });
    }

    const results: Record<string, number> = {};
    (poll.options || []).forEach((o: any) => {
      if (o?.id) results[String(o.id)] = 0;
    });

    let userVoteOptionId: string | null = null;
    (voteRows || []).forEach((r: any) => {
      const oid = String(r.option_id || '');
      if (oid && results[oid] !== undefined) results[oid] += 1;
      if (r.user_id === userId) userVoteOptionId = oid;
    });

    return NextResponse.json({
      success: true,
      poll: {
        results,
        totalVotes: (voteRows || []).length,
        userVoteOptionId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to vote', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


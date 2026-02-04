import { NextRequest, NextResponse } from 'next/server';
import { awardXP } from '@/lib/reputation';
import { createNotification } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { postId, voteType, userId } = await request.json();
    console.log('[POST VOTE API] Request received:', { postId, voteType, userId });

    if (!postId || !userId || !['up', 'down', null].includes(voteType)) {
      console.log('[POST VOTE API] Missing or invalid fields:', { postId, voteType, userId });
      return NextResponse.json(
        { error: 'Post ID, vote type, and user ID are required' },
        { status: 400 }
      );
    }

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from('post_votes')
      .select('id, vote_type')
      .match({ user_id: userId, post_id: postId })
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingError) {
      console.error('[POST VOTE API] Error checking existing vote:', existingError);
      return NextResponse.json({ error: 'Failed to check existing vote', details: existingError.message }, { status: 500 });
    }

    const existing = existingRows?.[0] ?? null;

    let action = 'none';

    try {
      if (voteType === null) {
        if (existing?.id) {
          const { error } = await supabaseAdmin.from('post_votes').delete().eq('id', existing.id);
          if (error) throw error;
          action = 'delete';
        }
      } else if (!existing) {
        const { error } = await supabaseAdmin
          .from('post_votes')
          .insert({ user_id: userId, post_id: postId, vote_type: voteType });
        if (error) throw error;
        action = 'insert';
      } else if (existing.vote_type !== voteType) {
        const { error } = await supabaseAdmin
          .from('post_votes')
          .update({ vote_type: voteType })
          .eq('id', existing.id);
        if (error) throw error;
        action = 'update';
      } else {
        const { error } = await supabaseAdmin.from('post_votes').delete().eq('id', existing.id);
        if (error) throw error;
        action = 'delete';
      }

      console.log('[POST VOTE API] Vote operation completed:', { existing, voteType, action });
    } catch (voteError) {
      console.error('[POST VOTE API] Exception during vote operation:', voteError);
      return NextResponse.json({ error: 'Failed to update vote', details: voteError instanceof Error ? voteError.message : String(voteError) }, { status: 500 });
    }

    const [upResult, downResult, meVoteResult] = await Promise.all([
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: postId, vote_type: 'up' }),
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: postId, vote_type: 'down' }),
      supabaseAdmin
        .from('post_votes')
        .select('vote_type')
        .match({ post_id: postId, user_id: userId })
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const upvotes = upResult.error ? 0 : upResult.count ?? 0;
    const downvotes = downResult.error ? 0 : downResult.count ?? 0;
    const meVote = meVoteResult.error ? null : (meVoteResult.data?.[0] ?? null);

    if (upResult.error) console.error('[POST VOTE API] Upvote count error:', upResult.error);
    if (downResult.error) console.error('[POST VOTE API] Downvote count error:', downResult.error);
    if (meVoteResult.error) console.error('[POST VOTE API] User vote query error:', meVoteResult.error);

    const { data: dbPost, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !dbPost) {
      console.error('[POST VOTE API] Post not found after voting:', postError);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const authorId = dbPost.authorId ?? dbPost.author_id ?? null;

    let postAuthor: any = null;
    if (authorId) {
      const { data: authorData, error: authorError } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar, xp, title')
        .eq('id', authorId)
        .maybeSingle();

      if (authorError) {
        console.error('[POST VOTE API] Error fetching author:', authorError);
      } else {
        postAuthor = authorData;
      }
    }

    const votesPayload = { upvotes, downvotes };
    const { error: updateVotesError } = await supabaseAdmin
      .from('posts')
      .update({ votes: votesPayload, updated_at: new Date().toISOString() })
      .eq('id', postId);

    if (updateVotesError) {
      console.error('[POST VOTE API] Error updating post vote totals:', updateVotesError);
    }

    const createdAtRaw = dbPost.createdAt ?? dbPost.created_at ?? new Date().toISOString();

    const updatedPost = {
      id: dbPost.id,
      title: dbPost.title,
      content: dbPost.content,
      category: dbPost.category,
      author: {
        id: authorId,
        name: postAuthor?.username || 'Unknown',
        avatar: postAuthor?.avatar || null,
        reputation: postAuthor?.xp ?? 0,
        title: postAuthor?.title || null,
      },
      createdAt: typeof createdAtRaw === 'string' ? createdAtRaw : new Date(createdAtRaw).toISOString(),
      votes: votesPayload,
      replies: dbPost.replies ?? dbPost.replies_count ?? 0,
      userVote: meVote?.vote_type ?? null,
      isModerated: dbPost.isModerated ?? true,
    };

    if (voteType === 'up' && authorId) {
      try {
        const xpResult = await awardXP(
          authorId,
          postAuthor?.username || 'Unknown',
          'POST_GETS_LIKE',
          postId
        );

        if (xpResult?.leveledUp) {
          console.log(`🎉 ${postAuthor?.username || authorId} leveled up to level ${xpResult.newLevel} from receiving a like!`);
        }

        // Notify post author of like (only if voter is not the author)
        if (userId !== authorId) {
          await createNotification({
            userId: authorId,
            type: 'like',
            actorId: userId,
            entityType: 'post',
            entityId: postId,
            url: `/forums/post/${postId}`,
            message: undefined, // inferTitle will use actor username
          });
        }
      } catch (xpError) {
        console.error('[POST VOTE API] Error awarding XP:', xpError);
      }
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
    });
  } catch (error) {
    console.error('[POST VOTE API] Unhandled error:', error);
    console.error('[POST VOTE API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to update vote', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function parsePoll(raw: any) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    const { data: dbPost, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (postError || !dbPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    let postAuthor: any = null;
    const authorId = dbPost.authorId ?? dbPost.author_id ?? null;
    if (authorId) {
      const { data: authorData, error: authorError } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar, xp, title')
        .eq('id', authorId)
        .maybeSingle();

      if (authorError) {
        console.error('Error fetching post author:', authorError);
      } else {
        postAuthor = authorData;
      }
    }

    const [{ count: upvotes }, { count: downvotes }, meVoteResult] = await Promise.all([
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: id, vote_type: 'up' }),
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: id, vote_type: 'down' }),
      userId
        ? supabaseAdmin
            .from('post_votes')
            .select('vote_type')
            .match({ post_id: id, user_id: userId })
            .order('created_at', { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [] as any[], error: null } as any),
    ]);

    const meVote = Array.isArray((meVoteResult as any).data) ? (meVoteResult as any).data[0] : null;
    const createdAtRaw = dbPost.createdAt ?? dbPost.created_at ?? new Date().toISOString();
    const createdAt = typeof createdAtRaw === 'string' ? createdAtRaw : new Date(createdAtRaw).toISOString();
    const postType = (dbPost.postType ?? dbPost.post_type ?? 'text') as string;
    const poll = parsePoll(dbPost.poll);

    const post = {
      id: dbPost.id,
      title: dbPost.title,
      content: dbPost.content,
      category: dbPost.category,
      postType,
      poll: postType === 'poll' ? poll : null,
      author: {
        id: authorId,
        name: postAuthor?.username || 'Unknown',
        avatar: postAuthor?.avatar || null,
        reputation: postAuthor?.xp ?? 0,
        title: postAuthor?.title || null
      },
      createdAt,
      votes: {
        upvotes: upvotes ?? 0,
        downvotes: downvotes ?? 0,
      },
      replies: dbPost.replies ?? dbPost.replies_count ?? 0,
      userVote: meVote?.vote_type ?? null,
      isModerated: true
    };

    // Overlay poll results + user's poll vote (best-effort; will no-op if table doesn't exist yet)
    if (postType === 'poll' && poll?.options?.length) {
      try {
        const { data: voteRows, error: pollVotesError } = await supabaseAdmin
          .from('post_poll_votes')
          .select('option_id, user_id')
          .eq('post_id', id);

        if (pollVotesError) throw pollVotesError;

        const results: Record<string, number> = {};
        (poll.options || []).forEach((o: any) => {
          if (o?.id) results[String(o.id)] = 0;
        });

        let userVoteOptionId: string | null = null;
        (voteRows || []).forEach((r: any) => {
          const oid = String(r.option_id || '');
          if (oid && results[oid] !== undefined) results[oid] += 1;
          if (userId && r.user_id === userId) userVoteOptionId = oid;
        });

        (post as any).poll = {
          ...(post as any).poll,
          results,
          totalVotes: (voteRows || []).length,
          userVoteOptionId
        };
      } catch (e) {
        // ignore if not configured yet
      }
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching post detail:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorId } = await request.json();

    const { data: post, error: findError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError || !post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }

    const postAuthorId = post.authorId ?? post.author_id ?? post.authorid ?? null;

    if (!postAuthorId || postAuthorId !== authorId) {
      return NextResponse.json(
        { message: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    const { data: commentRows, error: commentFetchError } = await supabaseAdmin
      .from('comments')
      .select('id')
      .eq('post_id', id);

    if (commentFetchError) {
      console.error('Error fetching comments before deleting post:', commentFetchError);
      return NextResponse.json(
        { message: 'Failed to delete post', details: commentFetchError.message },
        { status: 500 }
      );
    }

    const commentIds = (commentRows || []).map((row) => row.id);
    if (commentIds.length > 0) {
      const { error: deleteCommentLikesError } = await supabaseAdmin
        .from('comment_likes')
        .delete()
        .in('comment_id', commentIds);

      if (deleteCommentLikesError) {
        console.error('Error deleting comment likes for post:', deleteCommentLikesError);
        return NextResponse.json(
          { message: 'Failed to delete post', details: deleteCommentLikesError.message },
          { status: 500 }
        );
      }

      const { error: deleteCommentsError } = await supabaseAdmin
        .from('comments')
        .delete()
        .in('id', commentIds);

      if (deleteCommentsError) {
        console.error('Error deleting comments for post:', deleteCommentsError);
        return NextResponse.json(
          { message: 'Failed to delete post', details: deleteCommentsError.message },
          { status: 500 }
        );
      }
    }

    const { error: deleteVotesError } = await supabaseAdmin
      .from('post_votes')
      .delete()
      .eq('post_id', id);

    if (deleteVotesError) {
      console.error('Error deleting post votes:', deleteVotesError);
      return NextResponse.json(
        { message: 'Failed to delete post', details: deleteVotesError.message },
        { status: 500 }
      );
    }

    const { error: deletePostError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id);

    if (deletePostError) {
      console.error('Error deleting post:', deletePostError);
      return NextResponse.json(
        { message: 'Failed to delete post', details: deletePostError.message },
        { status: 500 }
      );
    }

    console.log(`Forum post deleted: ${id} by user ${authenticatedUser.id}`);

    return NextResponse.json(
      { message: 'Post deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { message: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

    const post = {
      id: dbPost.id,
      title: dbPost.title,
      content: dbPost.content,
      category: dbPost.category,
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
      .select('id, author_id, authorId')
      .eq('id', id)
      .maybeSingle();

    if (findError || !post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }

    const postAuthorId = post.author_id ?? post.authorId;

    if (postAuthorId !== authorId) {
      return NextResponse.json(
        { message: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    await supabaseAdmin
      .from('post_votes')
      .delete()
      .eq('post_id', id);

    console.log(`Forum post deleted: ${id} by user ${authorId}`);

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

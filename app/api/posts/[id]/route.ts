import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    // Get post from Supabase (bypassing Prisma)
    const { data: dbPost, error: postError } = await supabaseAdmin
      .from('posts')
      .select(`
        id,
        title,
        content,
        category,
        authorId,
        votes,
        replies,
        createdAt,
        updatedAt,
        author:users!posts_authorId_fkey(
          id,
          username,
          avatar,
          xp,
          title
        )
      `)
      .eq('id', id)
      .single();

    if (postError || !dbPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get vote counts from Supabase
    const [{ count: upvotes }, { count: downvotes }, { data: meVote }] = await Promise.all([
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: id, vote_type: 'up' }),
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: id, vote_type: 'down' }),
      userId
        ? supabaseAdmin.from('post_votes').select('vote_type').match({ post_id: id, user_id: userId }).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    // Format post
    const post = {
      id: dbPost.id,
      title: dbPost.title,
      content: dbPost.content,
      category: dbPost.category,
      author: {
        id: dbPost.author?.id || dbPost.authorId,
        name: dbPost.author?.username || 'Unknown',
        avatar: dbPost.author?.avatar || null,
        reputation: dbPost.author?.xp ?? 0,
        title: dbPost.author?.title || null
      },
      createdAt: typeof dbPost.createdAt === 'string' ? dbPost.createdAt : dbPost.createdAt.toISOString(),
      votes: {
        upvotes: upvotes ?? 0,
        downvotes: downvotes ?? 0,
      },
      replies: dbPost.replies || 0,
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

    // Find the post in Supabase
    const { data: post, error: findError } = await supabaseAdmin
      .from('posts')
      .select('id, authorId')
      .eq('id', id)
      .single();
    
    if (findError || !post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if the user is the author of the post
    if (post.authorId !== authorId) {
      return NextResponse.json(
        { message: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    // Delete the post from Supabase (comments will be deleted automatically due to CASCADE)
    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      throw deleteError;
    }

    // Also delete votes from Supabase
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

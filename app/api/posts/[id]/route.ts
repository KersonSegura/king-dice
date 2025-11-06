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

    // Get post from database
    const dbPost = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            reputation: true,
            title: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });

    if (!dbPost) {
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
        id: dbPost.author.id,
        name: dbPost.author.username,
        avatar: dbPost.author.avatar,
        reputation: dbPost.author.reputation,
        title: dbPost.author.title
      },
      createdAt: dbPost.createdAt.toISOString(),
      votes: {
        upvotes: upvotes ?? 0,
        downvotes: downvotes ?? 0,
      },
      replies: dbPost._count.comments,
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

    // Find the post in database
    const post = await prisma.post.findUnique({
      where: { id }
    });
    
    if (!post) {
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

    // Delete the post (comments will be deleted automatically due to onDelete: Cascade)
    await prisma.post.delete({
      where: { id }
    });

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

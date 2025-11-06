import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/posts';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    const base = getAllPosts().find(p => p.id === id) || null;
    if (!base) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Overlay counts and user vote from Supabase
    const [{ count: upvotes }, { count: downvotes }, { data: meVote }] = await Promise.all([
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: id, vote_type: 'up' }),
      supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: id, vote_type: 'down' }),
      userId
        ? supabaseAdmin.from('post_votes').select('vote_type').match({ post_id: id, user_id: userId }).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    const post = {
      ...base,
      votes: {
        upvotes: upvotes ?? base.votes?.upvotes ?? 0,
        downvotes: downvotes ?? base.votes?.downvotes ?? 0,
      },
      userVote: meVote?.vote_type ?? null,
    } as any;

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching post detail:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

const dataFilePath = path.join(process.cwd(), 'data', 'posts.json');

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorId } = await request.json();

    // Read current posts - the file contains an array directly
    const posts = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

    // Find the post
    const postIndex = posts.findIndex((post: any) => post.id === id);
    
    if (postIndex === -1) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }

    const post = posts[postIndex];

    // Check if the user is the author of the post
    if (post.author.id !== authorId) {
      return NextResponse.json(
        { message: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    // Remove the post
    posts.splice(postIndex, 1);

    // Save updated posts - save as array directly
    fs.writeFileSync(dataFilePath, JSON.stringify(posts, null, 2));

    return NextResponse.json(
      { message: 'Post deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

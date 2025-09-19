import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'posts.json');

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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

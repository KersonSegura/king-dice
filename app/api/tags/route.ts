import { NextRequest, NextResponse } from 'next/server';
import { getAllTags, createTag, getPopularTags } from '@/lib/tags';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const popular = searchParams.get('popular');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (popular === 'true') {
      const tags = getPopularTags(limit);
      return NextResponse.json({ tags });
    }
    
    const tags = getAllTags();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    const tag = createTag(name);
    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}

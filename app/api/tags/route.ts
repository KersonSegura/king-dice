import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Default tags
const defaultTags = [
  { id: 'dice-throne', name: 'dice-throne', count: 0, createdAt: new Date().toISOString() },
  { id: 'board-game', name: 'board-game', count: 0, createdAt: new Date().toISOString() },
  { id: 'collection', name: 'collection', count: 0, createdAt: new Date().toISOString() },
  { id: 'setup', name: 'setup', count: 0, createdAt: new Date().toISOString() },
  { id: 'custom', name: 'custom', count: 0, createdAt: new Date().toISOString() },
  { id: 'art', name: 'art', count: 0, createdAt: new Date().toISOString() },
  { id: 'dice', name: 'dice', count: 0, createdAt: new Date().toISOString() },
  { id: 'gaming', name: 'gaming', count: 0, createdAt: new Date().toISOString() }
];

export async function GET(request: NextRequest) {
  try {
    // Return default tags (tags are optional, not critical for functionality)
    return NextResponse.json({ tags: defaultTags });
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
    
    // Create tag in memory (just return it)
    const tag = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name.toLowerCase().trim(),
      count: 0,
      createdAt: new Date().toISOString()
    };
    
    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}

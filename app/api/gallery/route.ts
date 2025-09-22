import { NextRequest, NextResponse } from 'next/server';
import { getAllImages, getAllCategories, getUserVote } from '@/lib/gallery';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const author = searchParams.get('author');
    const userId = searchParams.get('userId');
    
    let images = getAllImages();
    
    // Filter by category
    if (category && category !== 'all') {
      images = images.filter(image => image.category === category);
    }
    
    // Filter by author
    if (author) {
      images = images.filter(image => image.author.id === author || image.author.name === author);
    }
    
    // Add user vote information if userId is provided
    if (userId) {
      images = images.map(image => ({
        ...image,
        userVote: getUserVote(image.id, userId)
      }));
    }
    
    // Sort by creation date (newest first)
    images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const categories = getAllCategories();
    
    return NextResponse.json({
      images,
      categories,
      totalImages: images.length
    }, {
      headers: {
        'Cache-Control': 'public, max-age=120', // Cache for 2 minutes (gallery changes moderately)
        'CDN-Cache-Control': 'public, max-age=120'
      }
    });
  } catch (error) {
    console.error('Error fetching gallery data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery data' },
      { status: 500 }
    );
  }
} 
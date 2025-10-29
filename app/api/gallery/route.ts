import { NextRequest, NextResponse } from 'next/server';
import { getAllImages, getAllCategories, getUserVote } from '@/lib/gallery';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const author = searchParams.get('author');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    let images = getAllImages();

    // Normalize legacy local URLs to Supabase public URLs
    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl) {
      images = images.map(image => {
        const updated = { ...image } as any;
        const rewrite = (url: string | undefined): string | undefined => {
          if (!url) return url;
          // If already absolute (http), keep as is
          if (/^https?:\/\//i.test(url)) return url;
          // /gallery/filename -> Supabase gallery bucket
          if (url.startsWith('/gallery/')) {
            const filename = url.split('/').pop();
            if (filename) return `${supabaseUrl}/storage/v1/object/public/gallery/${filename}`;
          }
          // /uploads/rules-images/file -> Supabase rules-images bucket
          if (url.startsWith('/uploads/rules-images/')) {
            const rel = url.replace('/uploads/', '');
            return `${supabaseUrl}/storage/v1/object/public/${rel}`;
          }
          // /uploads/filename -> Supabase uploads bucket
          if (url.startsWith('/uploads/')) {
            const filename = url.replace('/uploads/', '');
            return `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`;
          }
          return url;
        };

        updated.imageUrl = rewrite(updated.imageUrl) || updated.imageUrl;
        updated.thumbnailUrl = rewrite(updated.thumbnailUrl) || updated.thumbnailUrl;
        // Rewrite author avatar if stored locally
        if (updated.author && typeof updated.author === 'object') {
          updated.author.avatar = rewrite(updated.author.avatar) || updated.author.avatar;
        }
        return updated;
      });
    }
    
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
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedImages = images.slice(startIndex, endIndex);
    
    const categories = getAllCategories();
    
    return NextResponse.json({
      images: paginatedImages,
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

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, category, description, authorId } = await request.json();

    if (!imageUrl || !category || !description || !authorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch user data to get actual username and avatar
    let authorName = 'User';
    let authorAvatar = '/default-avatar.png';
    
    try {
      const userResponse = await fetch(`${request.nextUrl.origin}/api/users/profile?userId=${authorId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        authorName = userData.user?.username || 'User';
        authorAvatar = userData.user?.avatar || '/default-avatar.png';
      }
    } catch (error) {
      console.error('Error fetching user data for gallery post:', error);
    }

    // Read existing gallery data
    const galleryPath = path.join(process.cwd(), 'data', 'gallery.json');
    let galleryData: { images: any[] } = { images: [] };
    
    if (fs.existsSync(galleryPath)) {
      const fileContent = fs.readFileSync(galleryPath, 'utf8');
      galleryData = JSON.parse(fileContent);
    }

    // Create new image entry
    const newImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageUrl,
      thumbnailUrl: imageUrl, // Use same URL for thumbnail (can be optimized later)
      title: category === 'Collections' ? 'Collection Photo' : 'Favorite Card',
      description,
      category,
      author: {
        id: authorId,
        name: authorName,
        avatar: authorAvatar
      },
      createdAt: new Date().toISOString(),
      votes: {
        upvotes: 0,
        downvotes: 0,
        voters: []
      },
      comments: []
    };

    // Add to gallery
    galleryData.images.unshift(newImage);

    // Write back to file
    fs.writeFileSync(galleryPath, JSON.stringify(galleryData, null, 2));

    return NextResponse.json({
      success: true,
      image: newImage
    });
  } catch (error) {
    console.error('Error posting to gallery:', error);
    return NextResponse.json(
      { error: 'Failed to post to gallery' },
      { status: 500 }
    );
  }
} 
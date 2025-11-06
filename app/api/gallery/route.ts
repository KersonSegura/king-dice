import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories } from '@/lib/gallery';
import { supabaseAdmin } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const author = searchParams.get('author') || '';
    const userId = searchParams.get('userId') || '';

    // Get images from database
    const dbImages = await prisma.galleryImage.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            reputation: true,
            title: true,
            isVerified: true,
            isAdmin: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format to match expected structure
    let images = dbImages.map(img => ({
      id: img.id,
      title: img.title,
      description: img.description || '',
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      category: img.category,
      author: {
        id: img.author.id,
        name: img.author.username,
        avatar: img.author.avatar,
        reputation: img.author.reputation,
        title: img.author.title
      },
      createdAt: img.createdAt.toISOString(),
      votes: JSON.parse(img.votes),
      views: img.views,
      downloads: img.downloads,
      comments: img.comments,
      isModerated: true,
      tags: [],
      weeklyLikes: {
        likesReceivedThisWeek: 0,
        weekId: ''
      }
    }));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

    if (supabaseUrl) {
      images = images.map(image => {
        const updated = { ...image } as any;
        const rewrite = (url: string | undefined): string | undefined => {
          if (!url) return url;

          // If already absolute Supabase URL, fix path if needed
          if (url.startsWith('http') && url.includes('.supabase.co')) {
            return url;
          }

          // /gallery/filename -> Supabase gallery bucket
          if (url.startsWith('/gallery/')) {
            const rel = url.replace('/gallery/', '');
            return `${supabaseUrl}/storage/v1/object/public/gallery/${rel}`;
          }

          // /rules-images/file -> Supabase rules-images bucket
          if (url.startsWith('/rules-images/')) {
            const rel = url.replace('/rules-images/', '');
            return `${supabaseUrl}/storage/v1/object/public/rules-images/${rel}`;
          }

          // /uploads/filename -> Supabase uploads bucket (legacy nested path)
          if (url.startsWith('/uploads/')) {
            const filename = url.replace('/uploads/', '');
            return `${supabaseUrl}/storage/v1/object/public/uploads/uploads/${filename}`;
          }

          return url;
        };

        const originalImageUrl = updated.imageUrl;
        const originalThumbUrl = updated.thumbnailUrl;

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

    // Add user vote information from Supabase if userId is provided
    if (userId) {
      const imageIds = images.map(img => img.id);
      if (imageIds.length > 0) {
        const { data: votes, error } = await supabaseAdmin
          .from('gallery_votes')
          .select('gallery_image_id, vote_type')
          .eq('user_id', userId)
          .in('gallery_image_id', imageIds);
        if (error) {
          console.error('Error fetching user gallery votes:', error);
        }
        const idToVote = new Map<string, string>();
        (votes || []).forEach(v => idToVote.set(v.gallery_image_id, v.vote_type));
        images = images.map(img => ({
          ...img,
          userVote: (idToVote.get(img.id) as any) || null
        }));
      }
    }

    // Sort by creation date (newest first)
    images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const categories = getAllCategories();

    return NextResponse.json({
      images,
      categories
    });
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery images' },
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
      thumbnailUrl: imageUrl,
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

    return NextResponse.json({ image: newImage });
  } catch (error) {
    console.error('Error creating gallery image:', error);
    return NextResponse.json(
      { error: 'Failed to create gallery image' },
      { status: 500 }
    );
  }
} 
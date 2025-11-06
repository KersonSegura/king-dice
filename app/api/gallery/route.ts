import { NextRequest, NextResponse } from 'next/server';
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

    console.log('Fetching gallery images from Supabase (bypassing Prisma due to cache issues)...');

    // Fetch directly from Supabase instead of using Prisma
    let dbImages;
    try {
      const { data: supabaseImages, error: supabaseError } = await supabaseAdmin
        .from('gallery_images')
        .select(`
          id,
          title,
          description,
          imageUrl,
          thumbnailUrl,
          category,
          authorId,
          votes,
          views,
          comments,
          createdAt,
          updatedAt,
          author:users!gallery_images_authorId_fkey(
            id,
            username,
            avatar,
            reputation,
            title,
            isVerified,
            isAdmin
          )
        `)
        .order('createdAt', { ascending: false });
      
      if (supabaseError) {
        throw supabaseError;
      }
      
      // Map Supabase response to expected format
      dbImages = (supabaseImages || []).map((img: any) => ({
        id: img.id,
        title: img.title,
        description: img.description,
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        category: img.category,
        votes: img.votes,
        views: img.views,
        comments: img.comments,
        createdAt: new Date(img.createdAt),
        updatedAt: new Date(img.updatedAt),
        author: img.author || {
          id: img.authorId,
          username: 'Unknown',
          avatar: null,
          reputation: 0,
          title: null,
          isVerified: false,
          isAdmin: false
        }
      }));
      
      console.log(`✅ Fetched ${dbImages.length} images from Supabase`);
    } catch (dbError) {
      console.error('❌ Supabase query error:', dbError);
      console.error('Error details:', dbError instanceof Error ? dbError.message : String(dbError));
      
      // Return empty gallery if database fails
      const categories = [
        {
          id: 'dice-throne',
          name: 'Dice Throne',
          description: 'This is where legends roll. Showcase your custom die and claim your place in the Dice Throne.',
          icon: 'ThroneIcon.svg',
          color: 'bg-red-100 text-red-600',
          imageCount: 0
        },
        {
          id: 'the-kings-card',
          name: "The King's Card",
          description: 'Present your relic to the court. Each week, one card ascends to the King\'s side.',
          icon: 'KingsCard.svg',
          color: 'bg-pink-100 text-pink-600',
          imageCount: 0
        },
        {
          id: 'collections',
          name: 'Game Collections',
          description: 'Show off your board game collections',
          icon: 'CollectionIcon.svg',
          color: 'bg-blue-100 text-blue-600',
          imageCount: 0
        },
        {
          id: 'setups',
          name: 'Game Setups',
          description: 'Share your table layouts and game setups before the action begins',
          icon: 'SetupsIcon.svg',
          color: 'bg-green-100 text-green-600',
          imageCount: 0
        },
        {
          id: 'events',
          name: 'Game Events',
          description: 'Board game events and meetups',
          icon: 'EventsIcon.svg',
          color: 'bg-purple-100 text-purple-600',
          imageCount: 0
        }
      ];
      return NextResponse.json({
        images: [],
        categories
      });
    }

    // Format to match expected structure
    let images = dbImages.map(img => {
      let votes = { upvotes: 0, downvotes: 0 };
      try {
        votes = JSON.parse(img.votes);
      } catch (e) {
        console.error('Error parsing votes for image:', img.id, e);
      }

      return {
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
        votes,
        views: img.views,
        downloads: img.downloads,
        comments: img.comments,
        isModerated: true,
        tags: [],
        weeklyLikes: {
          likesReceivedThisWeek: 0,
          weekId: ''
        }
      };
    });

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

    // Define categories (static data)
    const categories = [
      {
        id: 'dice-throne',
        name: 'Dice Throne',
        description: 'This is where legends roll. Showcase your custom die and claim your place in the Dice Throne.',
        icon: 'ThroneIcon.svg',
        color: 'bg-red-100 text-red-600',
        imageCount: images.filter(img => img.category === 'dice-throne').length
      },
      {
        id: 'the-kings-card',
        name: "The King's Card",
        description: 'Present your relic to the court. Each week, one card ascends to the King\'s side.',
        icon: 'KingsCard.svg',
        color: 'bg-pink-100 text-pink-600',
        imageCount: images.filter(img => img.category === 'the-kings-card').length
      },
      {
        id: 'collections',
        name: 'Game Collections',
        description: 'Show off your board game collections',
        icon: 'CollectionIcon.svg',
        color: 'bg-blue-100 text-blue-600',
        imageCount: images.filter(img => img.category === 'collections').length
      },
      {
        id: 'setups',
        name: 'Game Setups',
        description: 'Share your table layouts and game setups before the action begins',
        icon: 'SetupsIcon.svg',
        color: 'bg-green-100 text-green-600',
        imageCount: images.filter(img => img.category === 'setups').length
      },
      {
        id: 'events',
        name: 'Game Events',
        description: 'Board game events and meetups',
        icon: 'EventsIcon.svg',
        color: 'bg-purple-100 text-purple-600',
        imageCount: images.filter(img => img.category === 'events').length
      }
    ];

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

    // Create new image in database
    const newImage = await prisma.galleryImage.create({
      data: {
        title: category === 'Collections' ? 'Collection Photo' : 'Favorite Card',
        description,
        imageUrl,
        thumbnailUrl: imageUrl,
        category,
        authorId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            reputation: true,
            title: true
          }
        }
      }
    });

    // Format response
    const formattedImage = {
      id: newImage.id,
      imageUrl: newImage.imageUrl,
      thumbnailUrl: newImage.thumbnailUrl,
      title: newImage.title,
      description: newImage.description,
      category: newImage.category,
      author: {
        id: newImage.author.id,
        name: newImage.author.username,
        avatar: newImage.author.avatar,
        reputation: newImage.author.reputation
      },
      createdAt: newImage.createdAt.toISOString(),
      votes: (() => {
        try {
          return JSON.parse(newImage.votes);
        } catch (e) {
          return { upvotes: 0, downvotes: 0 };
        }
      })(),
      comments: newImage.comments
    };

    console.log(`Gallery image created: ${newImage.id} by ${newImage.author.username}`);

    return NextResponse.json({ image: formattedImage });
  } catch (error) {
    console.error('Error creating gallery image:', error);
    return NextResponse.json(
      { error: 'Failed to create gallery image' },
      { status: 500 }
    );
  }
} 
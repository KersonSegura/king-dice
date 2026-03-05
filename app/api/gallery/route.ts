import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';
import { getAllBlockedUserIds } from '@/lib/blocked-users';

export const dynamic = 'force-dynamic';

type GalleryRow = Record<string, any>;

async function detectCamelCase(): Promise<boolean> {
  try {
    const { data } = await executeSupabaseQuery(
      () => supabaseAdmin.from('gallery_images').select('*').limit(1),
      { maxRetries: 1, baseDelay: 400, timeout: 10000 }
    );
    if (data && data.length > 0) {
      return Object.prototype.hasOwnProperty.call(data[0], 'imageUrl');
    }
  } catch (error) {
    console.error('Error detecting gallery_images casing:', error);
  }
  return false;
}

function parseVotes(value: any): { upvotes: number; downvotes: number } {
  if (!value) {
    return { upvotes: 0, downvotes: 0 };
  }
  if (typeof value === 'object') {
    const upvotes = Number(value.upvotes) || 0;
    const downvotes = Number(value.downvotes) || 0;
    return { upvotes, downvotes };
  }
  try {
    const parsed = JSON.parse(String(value));
    return {
      upvotes: Number(parsed?.upvotes) || 0,
      downvotes: Number(parsed?.downvotes) || 0
    };
  } catch (error) {
    console.error('Error parsing votes payload:', error);
    return { upvotes: 0, downvotes: 0 };
  }
}

function rewriteStorageUrl(origin: string | undefined, url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (!origin) return url;

  if (url.startsWith('http') && url.includes('.supabase.co')) {
    return url;
  }

  if (url.startsWith('/gallery/')) {
    const rel = url.replace('/gallery/', '');
    return `${origin}/storage/v1/object/public/gallery/${rel}`;
  }

  if (url.startsWith('/rules-images/')) {
    const rel = url.replace('/rules-images/', '');
    return `${origin}/storage/v1/object/public/rules-images/${rel}`;
  }

  if (url.startsWith('/uploads/')) {
    const filename = url.replace('/uploads/', '');
    return `${origin}/storage/v1/object/public/uploads/uploads/${filename}`;
  }

  return url;
}

function mapGalleryRow(row: GalleryRow, authorMap: Map<string, any>) {
  const authorId = row.authorId ?? row.author_id ?? row.userId ?? row.user_id ?? null;
  const authorData = authorMap.get(authorId || '') || {};

  // Log if author data is missing (for debugging)
  if (authorId && !authorData.username && !authorData.name) {
    console.warn(`⚠️ Author data not found for ID: ${authorId}`);
  }

  const createdAt = row.createdAt ?? row.created_at ?? new Date().toISOString();
  const updatedAt = row.updatedAt ?? row.updated_at ?? createdAt;

  const imageUrl = row.imageUrl ?? row.image_url ?? null;
  const thumbnailUrl = row.thumbnailUrl ?? row.thumbnail_url ?? imageUrl;
  const category = row.category ?? 'uncategorized';
  const title = row.title ?? (category === 'collections' ? 'Collection Photo' : 'Gallery Image');

  // Determine author name with better fallback logic
  let authorName = 'Unknown User';
  if (authorData.username) {
    authorName = authorData.username;
  } else if (authorId) {
    // Only use User ID as fallback if we have an ID but no user data
    // This should rarely happen if the query is working correctly
    authorName = `User ${authorId.substring(0, 8)}`;
    console.warn(`⚠️ Using fallback name for author ID: ${authorId}`);
  }

  return {
    id: row.id,
    title,
    description: row.description ?? '',
    imageUrl,
    thumbnailUrl,
    category,
    author: {
      id: authorId,
      name: authorName,
      avatar: authorData.avatar ?? null,
      reputation: authorData.xp ?? 0,
      title: authorData.title ?? null,
      isVerified: authorData.isVerified ?? false,
      isAdmin: authorData.isAdmin ?? false
    },
    createdAt: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
    votes: parseVotes(row.votes),
    views: row.views ?? row.views_count ?? 0,
    downloads: row.downloads ?? row.downloads_count ?? 0,
    comments: row.comments ?? row.comments_count ?? 0,
    isModerated: true,
    tags: Array.isArray(row.tags) ? row.tags : [],
    weeklyLikes: {
      likesReceivedThisWeek: 0,
      weekId: ''
    }
  };
}

function buildCategories(images: any[]) {
  return [
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
}

function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const counter = Math.floor(Math.random() * 36).toString(36);
  const fingerprint = Math.floor(Math.random() * 36).toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${counter}${fingerprint}${random}`.substring(0, 25);
}

function buildInsertPayload(useCamelCase: boolean, payload: {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
  authorId: string;
  now: string;
}): Record<string, any> {
  // Don't include 'views' or 'downloads' if they don't exist - let database defaults handle it
  const base = {
    id: payload.id,
    title: payload.title,
    description: payload.description,
    votes: JSON.stringify({ upvotes: 0, downvotes: 0 }),
    comments: 0,
    category: payload.category
  };

  if (useCamelCase) {
    return {
      ...base,
      imageUrl: payload.imageUrl,
      thumbnailUrl: payload.thumbnailUrl,
      authorId: payload.authorId,
      createdAt: payload.now,
      updatedAt: payload.now
    };
  }

  return {
    ...base,
    image_url: payload.imageUrl,
    thumbnail_url: payload.thumbnailUrl,
    author_id: payload.authorId,
    created_at: payload.now,
    updated_at: payload.now
  };
}

function selectColumns(useCamelCase: boolean): string {
  // Only select columns that exist in the database (matching upload route)
  if (useCamelCase) {
    return 'id, title, description, imageUrl, thumbnailUrl, category, authorId, votes, comments, createdAt, updatedAt';
  }
  return 'id, title, description, image_url, thumbnail_url, category, author_id, votes, comments, created_at, updated_at';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const author = searchParams.get('author') || '';
    const userId = searchParams.get('userId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const useCamelCase = await detectCamelCase();
    const authorLooksLikeId = author && author.length >= 8;

    let query = supabaseAdmin
      .from('gallery_images')
      .select(selectColumns(useCamelCase), { count: 'exact' })
      .order(useCamelCase ? 'createdAt' : 'created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (authorLooksLikeId) {
      query = query.eq(useCamelCase ? 'authorId' : 'author_id', author);
    }

    const { data: galleryRows, error: galleryError } = await executeSupabaseQuery(
      () => query,
      { maxRetries: 2, baseDelay: 400, timeout: 15000 }
    );

    if (galleryError) {
      console.error('Supabase gallery query error:', galleryError);
      return NextResponse.json({ images: [], categories: buildCategories([]) });
    }

    const data = galleryRows || [];
    const authorIds = Array.from(new Set(
      data
        .map(row => row.authorId ?? row.author_id ?? row.userId ?? row.user_id)
        .filter(Boolean)
    ));

    let authorMap = new Map<string, any>();
    if (authorIds.length > 0) {
      try {
        const { data: authors, error: authorError } = await executeSupabaseQuery(
          () => supabaseAdmin
            .from('users')
            .select('id, username, avatar, xp, title, isVerified, isAdmin')
            .in('id', authorIds as string[]),
          { maxRetries: 2, baseDelay: 400, timeout: 15000 }
        );
        if (authorError) {
          console.error('❌ Error fetching gallery authors:', authorError);
        } else if (authors) {
          authorMap = new Map(authors.map(author => {
            const normalizedAuthor = {
              ...author,
              username: author.username || null,
              isVerified: author.isVerified ?? false,
              isAdmin: author.isAdmin ?? false,
              xp: author.xp ?? 0
            };
            return [author.id, normalizedAuthor];
          }));
          
          // Log missing authors
          const foundIds = new Set(authors.map(a => a.id));
          const missingIds = authorIds.filter(id => !foundIds.has(id));
          if (missingIds.length > 0) {
            console.warn(`⚠️ Missing author data for ${missingIds.length} IDs:`, missingIds.slice(0, 5));
          }
        } else {
          console.warn('⚠️ No authors returned from query');
        }
      } catch (error) {
        console.error('❌ Unexpected error fetching gallery authors:', error);
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

    let images = data
      .map(row => mapGalleryRow(row, authorMap))
      .map(image => {
        const rewritten = { ...image };
        rewritten.imageUrl = rewriteStorageUrl(supabaseUrl, image.imageUrl);
        rewritten.thumbnailUrl = rewriteStorageUrl(supabaseUrl, image.thumbnailUrl);
        if (rewritten.author) {
          rewritten.author.avatar = rewriteStorageUrl(supabaseUrl, rewritten.author.avatar) || rewritten.author.avatar;
        }
        return rewritten;
      });

    if (author && !authorLooksLikeId) {
      images = images.filter(image => image.author.id === author || image.author.name === author);
    }

    // Filter out content from blocked users (both users I blocked and users who blocked me)
    if (userId) {
      const blockedUserIds = await getAllBlockedUserIds(userId);
      if (blockedUserIds.length > 0) {
        const blockedSet = new Set(blockedUserIds);
        images = images.filter(image => !blockedSet.has(image.author.id));
      }
    }

    if (userId && images.length > 0) {
      const imageIds = images.map(img => img.id);
      try {
        const { data: votes, error } = await executeSupabaseQuery(
          () => supabaseAdmin
            .from('gallery_votes')
            .select('gallery_image_id, vote_type')
            .eq('user_id', userId)
            .in('gallery_image_id', imageIds),
          { maxRetries: 2, baseDelay: 400, timeout: 15000 }
        );
        if (!error && votes) {
          const idToVote = new Map<string, string>();
          votes.forEach((vote: any) => idToVote.set(vote.gallery_image_id, vote.vote_type));
          images = images.map(image => ({
            ...image,
            userVote: idToVote.get(image.id) ?? null
          }));
        } else if (error) {
          console.error('Error fetching gallery votes for user:', error);
        }
      } catch (error) {
        console.error('Unexpected error fetching gallery votes:', error);
      }
    }

    return NextResponse.json({
      images,
      categories: buildCategories(images)
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
    const { imageUrl, category, description, authorId, title } = await request.json();

    console.log('📥 Gallery POST request:', { imageUrl, category, description, authorId, title });

    if (!imageUrl || !category || !description || !authorId) {
      console.error('❌ Missing required fields:', { imageUrl: !!imageUrl, category: !!category, description: !!description, authorId: !!authorId });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const useCamelCase = await detectCamelCase();
    const now = new Date().toISOString();
    const id = generateCuid();

    const payload = {
      id,
      title: title || (category === 'collections' ? 'Collection Photo' : category === 'the-kings-card' ? "The King's Card" : 'Gallery Image'),
      description: description || '',
      imageUrl,
      thumbnailUrl: imageUrl,
      category,
      authorId,
      now
    };

    const camelPayload = buildInsertPayload(true, payload);
    const snakePayload = buildInsertPayload(false, payload);

    let insertedRow: GalleryRow | null = null;
    let insertError: any = null;
    let usedCamel = useCamelCase;

    const tryInsert = async (useCamel: boolean) => {
      const payloadToUse = useCamel ? camelPayload : snakePayload;
      const columns = selectColumns(useCamel);
      return supabaseAdmin
        .from('gallery_images')
        .insert(payloadToUse)
        .select(columns)
        .maybeSingle();
    };

    if (useCamelCase) {
      const { data, error } = await tryInsert(true);
      insertedRow = data ?? null;
      insertError = error ?? null;
      usedCamel = !error;
    }

    if (!insertedRow || insertError) {
      const shouldRetry = !insertedRow && insertError && insertError.code === '42703';
      if (!useCamelCase || shouldRetry) {
        const { data, error } = await tryInsert(false);
        if (!error && data) {
          insertedRow = data;
          insertError = null;
          usedCamel = false;
        } else {
          insertError = error;
        }
      }
    }

    if (!insertedRow || insertError) {
      console.error('❌ Error inserting gallery image:', {
        error: insertError,
        category,
        authorId,
        imageUrl: imageUrl.substring(0, 50) + '...'
      });
      return NextResponse.json({ error: 'Failed to create gallery image', details: insertError?.message }, { status: 500 });
    }

    console.log('✅ Gallery image created successfully:', {
      id: insertedRow.id,
      category,
      authorId,
      title: insertedRow.title || insertedRow.title
    });

    const authorIds = [authorId];
    let authorMap = new Map<string, any>();
    try {
      const { data: authors, error: authorError } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar, xp, title, isVerified, isAdmin')
        .in('id', authorIds);
      if (authorError) {
        console.error('Error fetching author for gallery insert:', authorError);
      } else if (authors) {
        authorMap = new Map(authors.map(author => [author.id, {
          ...author,
          username: author.username || null,
          isVerified: author.isVerified ?? false,
          isAdmin: author.isAdmin ?? false,
          xp: author.xp ?? 0
        }]));
      }
    } catch (error) {
      console.error('Error fetching author for gallery insert:', error);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const mapped = mapGalleryRow(insertedRow, authorMap);
    mapped.imageUrl = rewriteStorageUrl(supabaseUrl, mapped.imageUrl);
    mapped.thumbnailUrl = rewriteStorageUrl(supabaseUrl, mapped.thumbnailUrl);
    if (mapped.author) {
      mapped.author.avatar = rewriteStorageUrl(supabaseUrl, mapped.author.avatar) || mapped.author.avatar;
    }

    return NextResponse.json({ image: mapped });
  } catch (error) {
    console.error('Error creating gallery image:', error);
    return NextResponse.json(
      { error: 'Failed to create gallery image' },
      { status: 500 }
    );
  }
} 
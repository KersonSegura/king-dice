import { NextRequest, NextResponse } from 'next/server';
import { awardXP } from '@/lib/reputation';
import { supabaseAdmin } from '@/lib/supabase';

function parseVotes(raw: any) {
  if (!raw) return { upvotes: 0, downvotes: 0 };
  if (typeof raw === 'object') {
    return {
      upvotes: Number(raw.upvotes) || 0,
      downvotes: Number(raw.downvotes) || 0
    };
  }
  try {
    const parsed = JSON.parse(String(raw));
    return {
      upvotes: Number(parsed?.upvotes) || 0,
      downvotes: Number(parsed?.downvotes) || 0
    };
  } catch {
    return { upvotes: 0, downvotes: 0 };
  }
}

function rewriteStorageUrl(origin: string | undefined, url: string | null | undefined) {
  if (!url) return url;
  if (!origin) return url;
  if (url.startsWith('http') && url.includes('.supabase.co')) return url;
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

function mapGalleryRow(row: Record<string, any>, author: any, origin: string | undefined) {
  const imageUrl = row.imageUrl ?? row.image_url ?? null;
  const thumbnailUrl = row.thumbnailUrl ?? row.thumbnail_url ?? imageUrl;
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    imageUrl: rewriteStorageUrl(origin, imageUrl) ?? '',
    thumbnailUrl: rewriteStorageUrl(origin, thumbnailUrl) ?? '',
    category: row.category ?? 'uncategorized',
    author: {
      id: author?.id ?? row.authorId ?? row.author_id ?? null,
      name: author?.username ?? author?.name ?? 'Unknown Artist',
      avatar: rewriteStorageUrl(origin, author?.avatar) ?? null,
      reputation: author?.xp ?? author?.reputation ?? 0,
      title: author?.title ?? null
    },
    votes: parseVotes(row.votes),
    views: row.views ?? row.views_count ?? 0,
    downloads: row.downloads ?? row.downloads_count ?? 0,
    comments: row.comments ?? row.comments_count ?? 0,
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? row.updated_at ?? new Date().toISOString(),
    weeklyLikes: row.weeklyLikes ?? row.weekly_likes ?? {
      likesReceivedThisWeek: 0,
      weekId: ''
    },
    userVote: row.userVote ?? null,
    isModerated: true,
    tags: Array.isArray(row.tags) ? row.tags : []
  };
}

export async function POST(request: NextRequest) {
  try {
    const { imageId, voteType, userId } = await request.json();

    if (!imageId || !userId) {
      return NextResponse.json(
        { error: 'Image ID and user ID are required' },
        { status: 400 }
      );
    }

    if (!['up', 'down', null].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      );
    }

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('gallery_votes')
      .select('id, vote_type')
      .eq('gallery_image_id', imageId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingErr) {
      console.error('Error checking existing gallery vote:', existingErr);
    }

    if (voteType === null) {
      if (existing?.id) {
        await supabaseAdmin.from('gallery_votes').delete().eq('id', existing.id);
      }
    } else if (!existing) {
      await supabaseAdmin.from('gallery_votes').insert({
        user_id: userId,
        gallery_image_id: imageId,
        vote_type: voteType,
      });
    } else if (existing.vote_type !== voteType) {
      await supabaseAdmin
        .from('gallery_votes')
        .update({ vote_type: voteType })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin.from('gallery_votes').delete().eq('id', existing.id);
    }

    const [{ count: upvotes }, { count: downvotes }, { data: meVote }] = await Promise.all([
      supabaseAdmin
        .from('gallery_votes')
        .select('*', { count: 'exact', head: true })
        .match({ gallery_image_id: imageId, vote_type: 'up' }),
      supabaseAdmin
        .from('gallery_votes')
        .select('*', { count: 'exact', head: true })
        .match({ gallery_image_id: imageId, vote_type: 'down' }),
      supabaseAdmin
        .from('gallery_votes')
        .select('vote_type')
        .match({ gallery_image_id: imageId, user_id: userId })
        .maybeSingle(),
    ]);

    const userVote = meVote?.vote_type ?? null;

    const { data: imageRow, error: imageError } = await supabaseAdmin
      .from('gallery_images')
      .select('*')
      .eq('id', imageId)
      .maybeSingle();

    if (imageError || !imageRow) {
      console.error('Error fetching gallery image after vote:', imageError);
      return NextResponse.json({
        success: true,
        image: {
          id: imageId,
          title: '',
          description: '',
          imageUrl: '',
          thumbnailUrl: '',
          category: 'uncategorized',
          author: {
            id: null,
            name: 'Unknown Artist',
            avatar: null,
            reputation: 0,
            title: null
          },
          votes: { upvotes: upvotes || 0, downvotes: downvotes || 0 },
          userVote,
          views: 0,
          downloads: 0,
          comments: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          weeklyLikes: { likesReceivedThisWeek: 0, weekId: '' },
          isModerated: true,
          tags: []
        }
      });
    }

    const authorId = imageRow.authorId ?? imageRow.author_id ?? null;
    let author: any = null;
    if (authorId) {
      const { data: authorRow } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar, xp, title')
        .eq('id', authorId)
        .maybeSingle();
      author = authorRow ?? null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

    const mappedImage = mapGalleryRow(imageRow, author, supabaseUrl);
    mappedImage.votes = { upvotes: upvotes || 0, downvotes: downvotes || 0 };
    mappedImage.userVote = userVote;

    if (userVote === 'up' && mappedImage.author?.id) {
      try {
        const xpResult = await awardXP(
          mappedImage.author.id,
          mappedImage.author.name,
          'IMAGE_GETS_LIKE',
          imageId
        );
        if (xpResult?.leveledUp) {
          console.log(`🎉 ${mappedImage.author.name} leveled up to level ${xpResult.newLevel} from receiving a like on their image!`);
        }
      } catch (xpError) {
        console.error('Error awarding XP (non-critical):', xpError);
      }
    }

    return NextResponse.json({ success: true, image: mappedImage });
  } catch (error) {
    console.error('Error updating image vote (Supabase-backed):', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
} 
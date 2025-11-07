import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createNotification } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function detectCommentCasing() {
  try {
    const { data } = await supabaseAdmin
      .from('comments')
      .select('*')
      .limit(1);
    if (data && data.length > 0) {
      return Object.prototype.hasOwnProperty.call(data[0], 'galleryImageId');
    }
  } catch (error) {
    console.error('detectCommentCasing error:', error);
  }
  return false;
}

function rewriteStorageUrl(origin: string | undefined, url?: string | null) {
  if (!url) return url ?? null;
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

function buildCommentObject(
  row: any,
  author: any,
  likes: number,
  userLiked: boolean,
  supabaseUrl: string | undefined
) {
  const authorId = row.authorId ?? row.author_id ?? null;
  const createdAtRaw = row.createdAt ?? row.created_at ?? new Date().toISOString();
  const createdAt = typeof createdAtRaw === 'string' ? createdAtRaw : new Date(createdAtRaw).toISOString();

  return {
    id: row.id,
    content: row.content ?? '',
    author: {
      id: authorId,
      name: author?.username || author?.name || 'Unknown Artist',
      avatar: rewriteStorageUrl(supabaseUrl, author?.avatar) ?? null,
      reputation: author?.xp ?? author?.reputation ?? 0,
      title: author?.title ?? null
    },
    createdAt,
    isEdited: false,
    likes,
    userLiked,
    replies: [] as any[]
  };
}

async function fetchCommentAuthors(authorIds: string[]) {
  if (!authorIds.length) return new Map<string, any>();
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar, xp, title')
      .in('id', authorIds);
    if (error) {
      console.error('Error fetching comment authors:', error);
      return new Map();
    }
    return new Map((data || []).map(author => [author.id, author]));
  } catch (err) {
    console.error('Unexpected error fetching comment authors:', err);
    return new Map();
  }
}

const dataDir = path.join(process.cwd(), 'data');
const legacyGalleryFile = path.join(dataDir, 'gallery.json');

function mapLegacyComment(comment: any, supabaseUrl: string | undefined) {
  const mappedReplies = Array.isArray(comment.replies)
    ? comment.replies.map((reply: any) => mapLegacyComment(reply, supabaseUrl))
    : [];

  return {
    id: comment.id,
    content: comment.content ?? '',
    author: {
      id: comment.author?.id ?? null,
      name: comment.author?.name || 'Unknown Artist',
      avatar: rewriteStorageUrl(supabaseUrl, comment.author?.avatar) ?? null,
      reputation: comment.author?.reputation ?? 0,
      title: comment.author?.title ?? null
    },
    createdAt: comment.createdAt ?? new Date().toISOString(),
    isEdited: comment.isEdited ?? false,
    likes: comment.likes ?? 0,
    userLiked: false,
    replies: mappedReplies
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const userIdParam = searchParams.get('userId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Determine column casing
    const useCamelCase = await detectCommentCasing();
    const selectColumnsCamel = 'id, content, galleryImageId, authorId, createdAt';
    const selectColumnsSnake = 'id, content, gallery_image_id, author_id, created_at';
    const filterColumnCamel = 'galleryImageId';
    const filterColumnSnake = 'gallery_image_id';
    const orderColumnCamel = 'createdAt';
    const orderColumnSnake = 'created_at';

    const runQuery = async (useCamel: boolean) => {
      const selectColumns = useCamel ? selectColumnsCamel : selectColumnsSnake;
      const filterColumn = useCamel ? filterColumnCamel : filterColumnSnake;
      const orderColumn = useCamel ? orderColumnCamel : orderColumnSnake;
      return supabaseAdmin
        .from('comments')
        .select(selectColumns)
        .eq(filterColumn, imageId)
        .order(orderColumn, { ascending: false });
    };

    let commentsData: any[] | null = null;
    let commentsError: any = null;

    const initial = await runQuery(useCamelCase);
    commentsData = initial.data || null;
    commentsError = initial.error || null;

    if (commentsError && commentsError.code === '42703') {
      const fallback = await runQuery(false);
      commentsData = fallback.data || null;
      commentsError = fallback.error || null;
    }

    if (commentsError) {
      console.error('Error fetching gallery comments:', commentsError);
      return NextResponse.json({ comments: [], totalComments: 0 }, { status: 200 });
    }

    const rows = commentsData || [];

    const commentIds = rows.map(row => row.id);
    const authorIds = Array.from(new Set(
      rows.map(row => row.authorId ?? row.author_id).filter(Boolean)
    )) as string[];
    const authorMap = await fetchCommentAuthors(authorIds);

    const likeCounts = new Map<string, number>();
    const userLikedSet = new Set<string>();

    if (commentIds.length > 0) {
      try {
        const { data: likesData, error: likesError } = await supabaseAdmin
          .from('comment_likes')
          .select('comment_id, user_id, vote_type')
          .in('comment_id', commentIds);

        if (likesError) {
          console.error('Error fetching comment likes:', likesError);
        } else {
          (likesData || []).forEach(like => {
            if (like.vote_type === 'upvote') {
              likeCounts.set(like.comment_id, (likeCounts.get(like.comment_id) || 0) + 1);
              if (userIdParam && like.user_id === userIdParam) {
                userLikedSet.add(like.comment_id);
              }
            }
          });
        }
      } catch (likeError) {
        console.error('Unexpected error fetching comment likes:', likeError);
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

    const commentObjects = new Map<string, any>();
    rows.forEach(row => {
      const likes = likeCounts.get(row.id) ?? 0;
      const userLiked = userLikedSet.has(row.id);
      const authorId = row.authorId ?? row.author_id ?? null;
      const author = authorId ? authorMap.get(authorId) : null;
      const comment = buildCommentObject(row, author, likes, userLiked, supabaseUrl);
      commentObjects.set(row.id, comment);
    });

    const topLevelComments: any[] = [];
    rows.forEach(row => {
      const parentId = row.parentId ?? row.parent_id ?? null;
      const comment = commentObjects.get(row.id);
      if (!comment) {
        return;
      }

      if (parentId && commentObjects.has(parentId)) {
        const parent = commentObjects.get(parentId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(comment);
        }
      } else if (!parentId) {
        topLevelComments.push(comment);
      }
    });

    const sortByCreatedDesc = (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const sortByCreatedAsc = (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    topLevelComments.sort(sortByCreatedDesc);
    commentObjects.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort(sortByCreatedAsc);
      }
    });

    let totalComments = rows.length;
    let responseComments = topLevelComments;

    if (rows.length > 0) {
      totalComments = topLevelComments.reduce((total: number, comment: any) => {
        const repliesCount = Array.isArray(comment.replies) ? comment.replies.length : 0;
        return total + 1 + repliesCount;
      }, 0);
    }

    if (rows.length === 0 && fs.existsSync(legacyGalleryFile)) {
      try {
        const legacyData = JSON.parse(fs.readFileSync(legacyGalleryFile, 'utf8'));
        const legacyImage = legacyData.images?.find((img: any) => img.id === imageId);
        if (legacyImage?.commentsList) {
          responseComments = legacyImage.commentsList.map((comment: any) => mapLegacyComment(comment, supabaseUrl));
          totalComments = responseComments.reduce((total: number, comment: any) => {
            return total + 1 + (comment.replies ? comment.replies.length : 0);
          }, 0);
        }
      } catch (legacyError) {
        console.error('Error loading legacy gallery comments:', legacyError);
      }
    }

    return NextResponse.json({ comments: responseComments, totalComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ comments: [], totalComments: 0 }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imageId, content, author } = await request.json();

    if (!imageId || !content?.trim() || !author) {
      return NextResponse.json({ error: 'Image ID, content, and author are required' }, { status: 400 });
    }

    if (!author.id || !author.name) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const useCamelCase = await detectCommentCasing();
    const now = new Date().toISOString();

    const timestampCuid = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestampCuid}${counter}${fingerprint}${random}`.substring(0, 25);

    const insertCamel = {
      id: generatedId,
      content: content.trim(),
      authorId: author.id,
      galleryImageId: imageId,
      parentId: null,
      createdAt: now,
      updatedAt: now
    };
    const insertSnake = {
      id: generatedId,
      content: content.trim(),
      author_id: author.id,
      gallery_image_id: imageId,
      parent_id: null,
      created_at: now,
      updated_at: now
    };

    const selectColumnsCamel = 'id, content, galleryImageId, authorId, createdAt';
    const selectColumnsSnake = 'id, content, gallery_image_id, author_id, created_at';

    const runInsert = async (useCamel: boolean) =>
      supabaseAdmin
        .from('comments')
        .insert(useCamel ? insertCamel : insertSnake)
        .select(useCamel ? selectColumnsCamel : selectColumnsSnake)
        .single();

    let insertResult = await runInsert(useCamelCase);
    if (insertResult.error && insertResult.error.code === '42703') {
      insertResult = await runInsert(false);
    }

    const { data: newComment, error: insertError } = insertResult;
    if (insertError || !newComment) {
      console.error('Error creating gallery comment:', insertError);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    // Update comment count (best effort)
    try {
      const { data: galleryRow } = await supabaseAdmin
        .from('gallery_images')
        .select('comments')
        .eq('id', imageId)
        .maybeSingle();
      const currentCount = galleryRow?.comments ?? 0;
      await supabaseAdmin
        .from('gallery_images')
        .update({ comments: currentCount + 1 })
        .eq('id', imageId);
    } catch (err) {
      console.error('Error updating gallery comment count:', err);
    }

    // Best effort notification
    try {
      const { data: galleryRow } = await supabaseAdmin
        .from('gallery_images')
        .select('authorId, author_id')
        .eq('id', imageId)
        .maybeSingle();
      const receiverId = galleryRow?.authorId ?? galleryRow?.author_id;
      if (receiverId && receiverId !== author.id) {
        await createNotification({
          userId: receiverId,
          type: 'comment',
          actorId: author.id,
          entityType: 'gallery_image',
          entityId: imageId,
          url: `/community-gallery?imageId=${imageId}#comment-${newComment.id}`,
          message: `${author.name} commented on your image`,
        });
      }
    } catch (notifyError) {
      console.error('Error sending notification for gallery comment:', notifyError);
    }

    const responseComment = {
      id: newComment.id,
      content: newComment.content,
      galleryImageId: newComment.galleryImageId ?? newComment.gallery_image_id ?? imageId,
      author: {
        id: author.id,
        name: author.name,
        avatar: author.avatar || null,
        title: author.title || null
      },
      createdAt: newComment.createdAt ?? newComment.created_at ?? now
    };

    return NextResponse.json({
      comment: responseComment,
      totalComments: undefined,
      moderationResult: { isAppropriate: true, confidence: 1 }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { moderateText } from '@/lib/moderation';
import { awardXP } from '@/lib/reputation';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';

// Force dynamic so likes/replies reflect immediately when navigating back
export const dynamic = 'force-dynamic';

type AnyRow = Record<string, any>;
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

function mapPostRow(row: AnyRow, authorMap: Map<string, any>) {
  const authorId = row.authorId ?? row.author_id ?? null;
  const createdAt = row.createdAt ?? row.created_at ?? new Date().toISOString();
  const votes = parseVotes(row.votes);
  const author = authorMap.get(authorId || '') || {};

  return {
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    category: row.category ?? 'general',
    author: {
      id: authorId,
      name: author.username || author.name || 'Unknown',
      avatar: author.avatar || null,
      reputation: author.xp ?? author.reputation ?? 0,
      title: author.title ?? null
    },
    createdAt: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
    votes,
    replies: row.replies ?? row.replies_count ?? 0,
    userVote: null,
    isModerated: true
  };
}

function buildInsertPayload(useCamel: boolean, payload: {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  now: string;
}) {
  const base = {
    id: payload.id,
    title: payload.title,
    content: payload.content,
    category: payload.category,
    votes: JSON.stringify({ upvotes: 0, downvotes: 0 }),
    replies: 0
  };

  if (useCamel) {
    return {
      ...base,
      authorId: payload.authorId,
      createdAt: payload.now,
      updatedAt: payload.now
    };
  }
  return {
    ...base,
    author_id: payload.authorId,
    created_at: payload.now,
    updated_at: payload.now
  };
}

function selectColumns(useCamel: boolean) {
  if (useCamel) {
    return 'id, title, content, category, authorId, votes, replies, createdAt, updatedAt';
  }
  return 'id, title, content, category, author_id, votes, replies, replies_count, created_at, updated_at';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('author') || searchParams.get('authorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId') || '';

    const { data: postRows, error: postsError } = await executeSupabaseQuery(
      () => supabaseAdmin.from('posts').select('*'),
      { maxRetries: 2, baseDelay: 400, timeout: 15000 }
    );

    if (postsError) {
      throw postsError;
    }

    if (!postRows) {
      return NextResponse.json({ posts: [], cached: false });
    }

    const filteredRows = postRows.filter(row => {
      if (!authorId) return true;
      const rowAuthor = row.authorId ?? row.author_id;
      return rowAuthor === authorId;
    });

    const authorIds = Array.from(new Set(filteredRows.map(row => row.authorId ?? row.author_id).filter(Boolean)));
    let authorMap = new Map<string, any>();
    if (authorIds.length > 0) {
      const { data: authors, error: authorsError } = await executeSupabaseQuery(
        () => supabaseAdmin
          .from('users')
          .select('id, username, avatar, xp, title')
          .in('id', authorIds as string[]),
        { maxRetries: 2, baseDelay: 400, timeout: 15000 }
      );

      if (authorsError) {
        console.error('Error fetching post authors:', authorsError);
      } else if (authors) {
        authorMap = new Map(authors.map((u: any) => [u.id, u]));
      }
    }

    const posts = filteredRows
      .map(row => mapPostRow(row, authorMap))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const startIndex = (page - 1) * limit;
    const paginatedPosts = posts.slice(startIndex, startIndex + limit);

    try {
      const ids = paginatedPosts.map(p => p.id);
      if (ids.length > 0) {
        const [{ data: up }, { data: down }] = await Promise.all([
          executeSupabaseQuery(
            () => supabaseAdmin.from('post_votes').select('post_id').in('post_id', ids).eq('vote_type', 'up'),
            { maxRetries: 2, baseDelay: 400, timeout: 15000 }
          ).then(r => ({ data: r.data })),
          executeSupabaseQuery(
            () => supabaseAdmin.from('post_votes').select('post_id').in('post_id', ids).eq('vote_type', 'down'),
            { maxRetries: 2, baseDelay: 400, timeout: 15000 }
          ).then(r => ({ data: r.data }))
        ]);

        const upCount: Record<string, number> = {};
        const downCount: Record<string, number> = {};
        ids.forEach(id => {
          upCount[id] = 0;
          downCount[id] = 0;
        });

        (up || []).forEach(r => {
          if (r.post_id && upCount[r.post_id] !== undefined) {
            upCount[r.post_id] += 1;
          }
        });
        (down || []).forEach(r => {
          if (r.post_id && downCount[r.post_id] !== undefined) {
            downCount[r.post_id] += 1;
          }
        });

        let userVotes: Record<string, string> = {};
        if (userId) {
          const { data: uv } = await executeSupabaseQuery(
            () => supabaseAdmin
              .from('post_votes')
              .select('post_id, vote_type')
              .in('post_id', ids)
              .eq('user_id', userId),
            { maxRetries: 2, baseDelay: 400, timeout: 15000 }
          );
          (uv || []).forEach((v: any) => {
            userVotes[v.post_id] = v.vote_type;
          });
        }

        for (let i = 0; i < paginatedPosts.length; i++) {
          const post = paginatedPosts[i];
          paginatedPosts[i] = {
            ...post,
            votes: {
              upvotes: upCount[post.id] ?? 0,
              downvotes: downCount[post.id] ?? 0
            },
            userVote: userVotes[post.id] ?? post.userVote
          };
        }
      }
    } catch (voteError) {
      console.warn('Failed to overlay Supabase votes on posts list:', voteError);
    }

    return NextResponse.json({ posts: paginatedPosts, cached: false });
  } catch (error) {
    console.error('Error fetching posts:', error);
    console.error('Error JSON:', JSON.stringify(error, null, 2));
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: 'Failed to fetch posts',
        details: error instanceof Error ? error.message : JSON.stringify(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { title, content, category, author } = body;

    if (!title?.trim() || !content?.trim() || !category || !author) {
      console.log('Validation failed:', { title, content, category, author });
      return NextResponse.json(
        { error: 'Title, content, category, and author are required' },
        { status: 400 }
      );
    }

    console.log('Validation passed, moderating title and content...');
    const [titleModeration, contentModeration] = await Promise.all([
      moderateText(title),
      moderateText(content)
    ]);

    console.log('Title moderation result:', titleModeration);
    console.log('Content moderation result:', contentModeration);

    if (!titleModeration.isAppropriate || !contentModeration.isAppropriate) {
      const rejectedModeration = !titleModeration.isAppropriate ? titleModeration : contentModeration;
      console.log('Post rejected by moderation:', rejectedModeration);
      return NextResponse.json(
        {
          error: 'Content was flagged as inappropriate',
          flags: rejectedModeration.flags
        },
        { status: 400 }
      );
    }

    console.log('Content approved, creating post...');

    const timestampCuid = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestampCuid}${counter}${fingerprint}${random}`.substring(0, 25);

    const now = new Date().toISOString();

    const payload = {
      id: generatedId,
      title: title.trim(),
      content: content.trim(),
      category,
      authorId: author.id,
      now
    };

    const camelPayload = buildInsertPayload(true, payload);
    const snakePayload = buildInsertPayload(false, payload);

    const runInsert = async (useCamel: boolean) =>
      supabaseAdmin
        .from('posts')
        .insert(useCamel ? camelPayload : snakePayload)
        .select(selectColumns(useCamel))
        .single();

    let insertResult = await runInsert(true);
    if (insertResult.error && insertResult.error.code === '42703') {
      insertResult = await runInsert(false);
    }

    const { data: newPost, error: createError } = insertResult;

    if (createError || !newPost) {
      throw new Error(`Failed to create post: ${createError?.message || 'Unknown error'}`);
    }

    const formattedPost = mapPostRow(newPost, new Map([[author.id, {
      username: author.name,
      avatar: author.avatar,
      xp: author.reputation,
      title: author.title
    }]]));

    console.log('Post created:', formattedPost);

    console.log('Awarding XP...');
    try {
      const xpResult = await awardXP(
        author.id,
        author.name,
        'CREATE_DISCUSSION',
        formattedPost.id
      );
      if (xpResult?.leveledUp) {
        console.log(`🎉 ${author.name} leveled up to level ${xpResult.newLevel} from creating a discussion!`);
      }
      console.log('XP awarded successfully');
    } catch (xpError) {
      console.error('Error awarding XP:', xpError);
    }

    console.log('Returning success response');
    return NextResponse.json({
      success: true,
      post: formattedPost,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
} 
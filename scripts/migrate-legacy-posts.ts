import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

const legacyPostsPath = path.join(process.cwd(), 'data', 'posts.json');
const legacyCommentsPath = path.join(process.cwd(), 'data', 'comments.json');

interface LegacyUserVote {
  userId: string;
  voteType: string;
}

interface LegacyPost {
  id: string;
  title: string;
  content: string;
  author?: {
    id?: string;
    name?: string;
    avatar?: string;
    reputation?: number;
  };
  category?: string;
  createdAt?: string;
  votes?: {
    upvotes?: number;
    downvotes?: number;
  };
  replies?: number;
  userVotes?: LegacyUserVote[];
}

interface LegacyComment {
  id: string;
  postId: string;
  content: string;
  author?: {
    id?: string;
    name?: string;
    avatar?: string;
  };
  createdAt?: string;
  votes?: {
    upvotes?: number;
    downvotes?: number;
  };
  userVote?: string;
}

main().catch(error => {
  console.error('Unexpected error during migration:', error);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(legacyPostsPath)) {
    console.log('No legacy posts file found. Nothing to migrate.');
    return;
  }

  const rawPosts = JSON.parse(fs.readFileSync(legacyPostsPath, 'utf8')) as LegacyPost[];
  const rawComments = fs.existsSync(legacyCommentsPath)
    ? (JSON.parse(fs.readFileSync(legacyCommentsPath, 'utf8')) as LegacyComment[])
    : [];

  if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
    console.log('No legacy posts found to migrate.');
    return;
  }

  console.log(`Preparing to migrate ${rawPosts.length} posts and ${rawComments.length} comments.`);

  const postPayloads = rawPosts.map(post => {
    const createdAt = post.createdAt ?? new Date().toISOString();
    const votesObject = {
      upvotes: post.votes?.upvotes ?? 0,
      downvotes: post.votes?.downvotes ?? 0
    };

    return {
      id: post.id,
      title: post.title ?? '',
      content: post.content ?? '',
      category: post.category ?? 'general',
      author_id: post.author?.id ?? null,
      votes: JSON.stringify(votesObject),
      replies: post.replies ?? 0,
      created_at: createdAt,
      updated_at: createdAt
    };
  });

  const postVotePayloads = rawPosts.flatMap(post => {
    if (!Array.isArray(post.userVotes)) return [] as any[];
    return post.userVotes
      .filter(vote => vote.userId && vote.voteType)
      .map(vote => ({
        post_id: post.id,
        user_id: vote.userId,
        vote_type: normalisePostVote(vote.voteType)
      }));
  }).filter(Boolean);

  const commentPayloads = rawComments.map(comment => {
    const createdAt = comment.createdAt ?? new Date().toISOString();
    return {
      id: comment.id,
      post_id: comment.postId,
      content: comment.content ?? '',
      author_id: comment.author?.id ?? null,
      parent_id: null,
      gallery_image_id: null,
      created_at: createdAt,
      updated_at: createdAt
    };
  });

  const commentLikePayloads = rawComments
    .filter(comment => comment.userVote?.toLowerCase() === 'up' || comment.userVote?.toLowerCase() === 'upvote')
    .map(comment => ({
      comment_id: comment.id,
      user_id: comment.author?.id ?? null,
      vote_type: 'upvote' as const
    }))
    .filter(payload => payload.user_id);

  if (postPayloads.length > 0) {
    const { error: postError } = await supabase.from('posts').upsert(postPayloads, { onConflict: 'id' });
    if (postError) {
      console.error('Failed to upsert posts:', postError);
      process.exit(1);
    }
  }

  if (postVotePayloads.length > 0) {
    const { error: postVoteError } = await supabase
      .from('post_votes')
      .upsert(postVotePayloads, { onConflict: 'post_id,user_id' });
    if (postVoteError) {
      console.error('Failed to upsert post votes:', postVoteError);
    }
  }

  if (commentPayloads.length > 0) {
    const { error: commentError } = await supabase
      .from('comments')
      .upsert(commentPayloads, { onConflict: 'id' });
    if (commentError) {
      console.error('Failed to upsert comments:', commentError);
      process.exit(1);
    }
  }

  if (commentLikePayloads.length > 0) {
    const { error: commentLikeError } = await supabase
      .from('comment_likes')
      .upsert(commentLikePayloads, { onConflict: 'comment_id,user_id' });
    if (commentLikeError) {
      console.error('Failed to upsert comment likes:', commentLikeError);
    }
  }

  console.log('Legacy forum migration complete.');
}

function normalisePostVote(voteType: string): 'up' | 'down' {
  const lower = voteType.toLowerCase();
  if (lower === 'up' || lower === 'upvote') {
    return 'up';
  }
  return 'down';
}

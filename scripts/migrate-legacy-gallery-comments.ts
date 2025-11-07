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

const galleryFile = path.join(process.cwd(), 'data', 'gallery.json');

type LegacyComment = {
  id: string;
  content?: string;
  author?: {
    id?: string;
    name?: string;
    avatar?: string;
    reputation?: number;
    title?: string;
  };
  createdAt?: string;
  isEdited?: boolean;
  likes?: number;
  userLikes?: string[];
  replies?: LegacyComment[];
};

type LegacyImage = {
  id: string;
  commentsList?: LegacyComment[];
};

type InsertCommentPayload = {
  id: string;
  content: string;
  author_id: string | null;
  gallery_image_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

type InsertLikePayload = {
  user_id: string;
  comment_id: string;
  vote_type: 'upvote';
};

async function main() {
  if (!fs.existsSync(galleryFile)) {
    console.error('Legacy gallery data not found at', galleryFile);
    process.exit(1);
  }

  const raw = fs.readFileSync(galleryFile, 'utf8');
  const legacyData = JSON.parse(raw);
  const images: LegacyImage[] = legacyData.images || [];

  const commentPayloads: InsertCommentPayload[] = [];
  const likePayloads: InsertLikePayload[] = [];

  const now = new Date().toISOString();

  const traverseComments = (comments: LegacyComment[] | undefined, imageId: string, parentId: string | null = null) => {
    if (!Array.isArray(comments)) return;

    for (const comment of comments) {
      if (!comment.id) continue;

      const createdAt = comment.createdAt || now;
      const authorId = comment.author?.id ?? null;

      commentPayloads.push({
        id: comment.id,
        content: comment.content ?? '',
        author_id: authorId,
        gallery_image_id: imageId,
        parent_id: parentId,
        created_at: createdAt,
        updated_at: createdAt
      });

      if (Array.isArray(comment.userLikes)) {
        for (const liker of comment.userLikes) {
          if (liker) {
            likePayloads.push({
              user_id: liker,
              comment_id: comment.id,
              vote_type: 'upvote'
            });
          }
        }
      }

      if (Array.isArray(comment.replies) && comment.replies.length > 0) {
        traverseComments(comment.replies, imageId, comment.id);
      }
    }
  };

  images.forEach(image => {
    traverseComments(image.commentsList, image.id, null);
  });

  if (commentPayloads.length === 0) {
    console.log('No legacy comments found to migrate.');
    process.exit(0);
  }

  console.log(`Preparing to upsert ${commentPayloads.length} comments and ${likePayloads.length} comment likes.`);

  const { error: commentError } = await supabase
    .from('comments')
    .upsert(commentPayloads, { onConflict: 'id' });

  if (commentError) {
    console.error('Failed to upsert comments:', commentError);
    process.exit(1);
  }

  if (likePayloads.length > 0) {
    const { error: likeError } = await supabase
      .from('comment_likes')
      .upsert(likePayloads, { onConflict: 'comment_id,user_id' });

    if (likeError) {
      console.error('Failed to upsert comment likes:', likeError);
      process.exit(1);
    }
  }

  console.log('Migration complete.');
}

main().catch(error => {
  console.error('Unexpected error during migration:', error);
  process.exit(1);
});

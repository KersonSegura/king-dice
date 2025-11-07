import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { awardXP } from '@/lib/reputation';
import { supabaseAdmin } from '@/lib/supabase';

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

    // 1) Toggle/Upsert into Supabase votes table (single source of truth)
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
      // Unlike (remove any existing row for this user/image)
      if (existing?.id) {
        await supabaseAdmin.from('gallery_votes').delete().eq('id', existing.id);
      }
    } else if (!existing) {
      // Insert new vote
      await supabaseAdmin.from('gallery_votes').insert({
        user_id: userId,
        gallery_image_id: imageId,
        vote_type: voteType,
      });
    } else if (existing.vote_type !== voteType) {
      // Swap vote type
      await supabaseAdmin
        .from('gallery_votes')
        .update({ vote_type: voteType })
        .eq('id', existing.id);
    } else {
      // Same vote clicked again -> toggle off
      await supabaseAdmin.from('gallery_votes').delete().eq('id', existing.id);
    }

    // 2) Tally counts and userVote from Supabase
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

    // 3) Load current image data from file to return a full image object
    const galleryPath = path.join(process.cwd(), 'data', 'gallery.json');
    let imageObj: any | null = null;
    try {
      const raw = fs.readFileSync(galleryPath, 'utf8');
      const data = JSON.parse(raw);
      imageObj = (data.images || []).find((img: any) => img.id === imageId) || null;
    } catch (e) {
      console.error('Error reading gallery file for return payload:', e);
    }

    if (!imageObj) {
      // If not found in local file, still return minimal object for client state
      imageObj = { id: imageId, votes: { upvotes: upvotes || 0, downvotes: downvotes || 0 } };
    }

    const updatedImage = {
      ...imageObj,
      votes: { upvotes: upvotes || 0, downvotes: downvotes || 0 },
      userVote,
    };

    // 4) Award XP to the image author for receiving a like (best-effort)
    if (userVote === 'up' && updatedImage.author?.id) {
      try {
        const xpResult = await awardXP(
          updatedImage.author.id,
          updatedImage.author.name,
          'IMAGE_GETS_LIKE',
          imageId
        );
        if (xpResult?.leveledUp) {
          console.log(`🎉 ${updatedImage.author.name} leveled up to level ${xpResult.newLevel} from receiving a like on their image!`);
        }
      } catch (xpError) {
        console.error('Error awarding XP (non-critical):', xpError);
      }
    }

    return NextResponse.json({ success: true, image: updatedImage });
  } catch (error) {
    console.error('Error updating image vote (Supabase-backed):', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
} 
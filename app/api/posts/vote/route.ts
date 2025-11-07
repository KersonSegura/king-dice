import { NextRequest, NextResponse } from 'next/server';
import { awardXP } from '@/lib/reputation';
import { supabaseAdmin } from '@/lib/supabase';
import { getAllPosts } from '@/lib/posts';

export async function POST(request: NextRequest) {
  try {
    const { postId, voteType, userId } = await request.json();
    console.log('[POST VOTE API] Request received:', { postId, voteType, userId });
    
    if (!postId || voteType === undefined || userId === undefined) {
      console.log('[POST VOTE API] Missing required fields:', { postId, voteType, userId });
      return NextResponse.json(
        { error: 'Post ID, vote type, and user ID are required' },
        { status: 400 }
      );
    }

    if (!['up', 'down', null].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      );
    }

    // 1) Toggle vote in Supabase post_votes
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('post_votes')
      .select('id, vote_type')
      .match({ user_id: userId, post_id: postId })
      .maybeSingle();

    if (existingError) {
      console.error('[POST VOTE API] Error checking existing vote:', existingError);
      return NextResponse.json({ error: 'Failed to check existing vote', details: existingError.message }, { status: 500 });
    }

    let voteResult;
    let action = 'none';
    
    try {
      if (voteType === null) {
        if (existing?.id) {
          voteResult = await supabaseAdmin.from('post_votes').delete().eq('id', existing.id);
          action = 'delete';
        }
      } else if (!existing) {
        voteResult = await supabaseAdmin.from('post_votes').insert({ user_id: userId, post_id: postId, vote_type: voteType });
        action = 'insert';
      } else if (existing.vote_type !== voteType) {
        voteResult = await supabaseAdmin.from('post_votes').update({ vote_type: voteType }).eq('id', existing.id);
        action = 'update';
      } else {
        voteResult = await supabaseAdmin.from('post_votes').delete().eq('id', existing.id);
        action = 'delete';
      }

      if (voteResult?.error) {
        console.error('[POST VOTE API] Error updating vote:', voteResult.error);
        return NextResponse.json({ error: 'Failed to update vote', details: voteResult.error.message }, { status: 500 });
      }
      
      console.log('[POST VOTE API] Vote operation completed:', { existing, voteType, action });
    } catch (voteError) {
      console.error('[POST VOTE API] Exception during vote operation:', voteError);
      return NextResponse.json({ error: 'Failed to update vote', details: voteError instanceof Error ? voteError.message : String(voteError) }, { status: 500 });
    }

    // 2) Recompute counts and userVote - use .count() to get the actual number
    let upvotes = 0;
    let downvotes = 0;
    let meVote = null;
    
    try {
      const [
        upResult,
        downResult,
        meVoteResult
      ] = await Promise.all([
        supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: postId, vote_type: 'up' }),
        supabaseAdmin.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: postId, vote_type: 'down' }),
        supabaseAdmin.from('post_votes').select('vote_type').match({ post_id: postId, user_id: userId }).maybeSingle(),
      ]);
      
      if (upResult.error) {
        console.error('[POST VOTE API] Upvote count error:', upResult.error);
      } else {
        upvotes = upResult.count ?? 0;
      }
      
      if (downResult.error) {
        console.error('[POST VOTE API] Downvote count error:', downResult.error);
      } else {
        downvotes = downResult.count ?? 0;
      }
      
      if (meVoteResult.error) {
        console.error('[POST VOTE API] User vote query error:', meVoteResult.error);
      } else {
        meVote = meVoteResult.data;
      }
      
      console.log('[POST VOTE API] Counts:', { upvotes, downvotes, meVote, userId, postId });
    } catch (countError) {
      console.error('[POST VOTE API] Error fetching counts:', countError);
      // Continue with defaults (0, 0, null)
    }

    // 3) Build updated post object by reading base post from file data
    let base;
    try {
      const allPosts = getAllPosts();
      base = allPosts.find(p => p.id === postId) || null;
    } catch (postsError) {
      console.error('[POST VOTE API] Error fetching posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch post data' }, { status: 500 });
    }
    
    if (!base) {
      console.error('[POST VOTE API] Post not found in getAllPosts():', postId);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // Ensure counts are numbers (Supabase count can be null)
    const finalUpvotes = typeof upvotes === 'number' ? upvotes : 0;
    const finalDownvotes = typeof downvotes === 'number' ? downvotes : 0;
    const finalUserVote = meVote?.vote_type || null;
    
    console.log('[POST VOTE API] Final values:', { finalUpvotes, finalDownvotes, finalUserVote, meVote });
    
    const updatedPost = {
      ...base,
      votes: { upvotes: finalUpvotes, downvotes: finalDownvotes },
      userVote: finalUserVote,
    } as any;

    // Award XP for voting (if voteType is not null and it's an upvote)
    if (voteType === 'up' && updatedPost.author?.id) {
      try {
        const xpResult = await awardXP(
          updatedPost.author.id,
          updatedPost.author.name,
          'POST_GETS_LIKE',
          postId
        );
        
        // Log level up if it occurred (server-side)
        if (xpResult?.leveledUp) {
          console.log(`🎉 ${updatedPost.author.name} leveled up to level ${xpResult.newLevel} from receiving a like!`);
        }
      } catch (xpError) {
        console.error('Error awarding XP:', xpError);
        // Don't fail the vote if XP awarding fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      post: updatedPost
    });
  } catch (error) {
    console.error('[POST VOTE API] Unhandled error:', error);
    console.error('[POST VOTE API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to update vote', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 
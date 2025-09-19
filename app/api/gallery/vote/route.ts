import { NextRequest, NextResponse } from 'next/server';
import { updateImageVote } from '@/lib/gallery';
import { awardXP } from '@/lib/reputation';

export async function POST(request: NextRequest) {
  try {
    const { imageId, voteType, userId } = await request.json();
    
    console.log('Vote API called with:', { imageId, voteType, userId });
    
    // Validate required fields
    if (!imageId || !userId) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Image ID and user ID are required' },
        { status: 400 }
      );
    }

    if (!['up', 'down', null].includes(voteType)) {
      console.log('Invalid vote type:', voteType);
      return NextResponse.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      );
    }
    
    // Update the vote
    console.log('Calling updateImageVote...');
    const updatedImage = updateImageVote(imageId, voteType, userId);
    console.log('updateImageVote result:', updatedImage ? 'success' : 'failed');
    
    if (!updatedImage) {
      console.log('Image not found for ID:', imageId);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    // Award XP to the image author for receiving a like (no daily limits for this)
    if (voteType === 'up' && updatedImage.author?.id) {
      try {
        const xpResult = awardXP(
          updatedImage.author.id,
          updatedImage.author.name,
          'POST_GETS_LIKE',
          imageId
        );
        
        // Log level up if it occurred (server-side)
        if (xpResult.leveledUp) {
          console.log(`🎉 ${updatedImage.author.name} leveled up to level ${xpResult.newLevel} from receiving a like on their image!`);
        }
      } catch (xpError) {
        console.error('Error awarding XP (non-critical):', xpError);
        // Don't fail the vote if XP awarding fails
      }
    }
    
    return NextResponse.json({
      success: true,
      image: updatedImage
    });
  } catch (error) {
    console.error('Error updating image vote:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to update vote', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
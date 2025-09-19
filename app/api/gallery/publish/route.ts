import { NextRequest, NextResponse } from 'next/server';
import { publishDraft } from '@/lib/gallery';
import { awardXP } from '@/lib/reputation';

export async function POST(request: NextRequest) {
  try {
    const { imageId, authorId, authorName } = await request.json();

    if (!imageId || !authorId || !authorName) {
      return NextResponse.json(
        { error: 'Image ID, author ID, and author name are required' },
        { status: 400 }
      );
    }

    // Publish the draft
    const publishedImage = publishDraft(imageId);
    
    if (!publishedImage) {
      return NextResponse.json(
        { error: 'Draft not found or already published' },
        { status: 404 }
      );
    }

    // Award XP for publishing an image
    const xpResult = awardXP(
      authorId,
      authorName,
      publishedImage.category === 'dice-throne' ? 'UPLOAD_DIE_DESIGN' : 'UPLOAD_IMAGE',
      imageId
    );
    
    // Log level up if it occurred (server-side)
    if (xpResult.leveledUp) {
      console.log(`🎉 ${authorName} leveled up to level ${xpResult.newLevel} from publishing an image!`);
    }

    return NextResponse.json({ 
      success: true, 
      image: publishedImage,
      message: 'Draft published successfully'
    });
  } catch (error) {
    console.error('Error publishing draft:', error);
    return NextResponse.json(
      { error: 'Failed to publish draft' },
      { status: 500 }
    );
  }
}

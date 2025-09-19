import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/gallery';
import { moderateImage, moderateText } from '@/lib/moderation';
import { awardXP } from '@/lib/reputation';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const authorString = formData.get('author') as string;

    let author;
    try {
      author = JSON.parse(authorString);
    } catch (e) {
      console.error('Error parsing author:', e);
      return NextResponse.json(
        { error: 'Invalid author data' },
        { status: 400 }
      );
    }

    if (!file || !category || !author) {
      return NextResponse.json(
        { error: 'Image, category, and author are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Moderate title and description text
    const textModerationPromises = [];
    
    if (title?.trim()) {
      textModerationPromises.push(moderateText(title));
    }
    
    if (description?.trim()) {
      textModerationPromises.push(moderateText(description));
    }
    
    // Only moderate text if there's text to moderate
    if (textModerationPromises.length > 0) {
      const textModerationResults = await Promise.all(textModerationPromises);
      
      // Check if any text was flagged as inappropriate
      const inappropriateText = textModerationResults.find(result => !result.isAppropriate);
      if (inappropriateText) {
        return NextResponse.json(
          { 
            error: 'Title or description was flagged as inappropriate',
            flags: inappropriateText.flags 
          },
          { status: 400 }
        );
      }
    }

    // Moderate image
    const moderationResult = await moderateImage(file);
    
    if (!moderationResult.isAppropriate) {
      return NextResponse.json(
        { 
          error: 'Image was flagged as inappropriate',
          flags: moderationResult.flags 
        },
        { status: 400 }
      );
    }

    // Upload image
    const imageData = await uploadImage({
      file,
      title: title?.trim() || '',
      category,
      author,
      description: formData.get('description') as string || '',
      tags: (formData.get('tags') as string || '').split(',').map(tag => tag.trim()).filter(tag => tag)
    });

    // Award XP for uploading an image (optional - don't fail upload if XP fails)
    if (imageData) {
      try {
        // Check if it's a dice design upload (Dice Throne category)
        const isDiceDesign = category === 'Dice Throne';
        
        const xpResult = awardXP(
          author.id,
          author.name,
          isDiceDesign ? 'UPLOAD_DIE_DESIGN' : 'UPLOAD_IMAGE',
          imageData.id
        );
        
        // Log level up if it occurred (server-side)
        if (xpResult.leveledUp) {
          console.log(`🎉 ${author.name} leveled up to level ${xpResult.newLevel} from uploading an image!`);
        }
      } catch (xpError) {
        console.error('Error awarding XP (non-critical):', xpError);
        // Don't fail the upload if XP awarding fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      image: imageData,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to upload image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
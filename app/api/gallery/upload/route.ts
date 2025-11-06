import { NextRequest, NextResponse } from 'next/server';
import { moderateImage, moderateText } from '@/lib/moderation';
import { awardXP } from '@/lib/reputation';
import { uploadToStorage, STORAGE_BUCKETS, supabaseAdmin } from '@/lib/supabase';

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

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `gallery-${timestamp}.${fileExtension}`;
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const uploadResult = await uploadToStorage(
      STORAGE_BUCKETS.GALLERY,
      filename,
      buffer,
      file.type
    );
    
    if (uploadResult.error) {
      throw new Error(`Failed to upload to Supabase Storage: ${uploadResult.error}`);
    }
    
    // Create image in database using Supabase directly (to avoid Prisma connection issues)
    // Try both camelCase and snake_case for column names
    const { data: imageData, error: createError } = await supabaseAdmin
      .from('gallery_images')
      .insert({
        title: title?.trim() || (category === 'collections' ? 'Collection Photo' : 'Favorite Card'),
        description: description || '',
        imageUrl: uploadResult.publicUrl,
        thumbnailUrl: uploadResult.publicUrl,
        category,
        authorId: author.id
      })
      .select('id, title, description, imageUrl, thumbnailUrl, category, votes, comments, createdAt, authorId')
      .single();

    if (createError || !imageData) {
      throw new Error(`Failed to create image in database: ${createError?.message || 'Unknown error'}`);
    }

    // Award XP for uploading an image (optional - don't fail upload if XP fails)
    try {
      // Check if it's a dice design upload (Dice Throne category)
      const isDiceDesign = category === 'dice-throne';
      
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

    // Format response
    const formattedImage = {
      id: imageData.id,
      title: imageData.title,
      description: imageData.description,
      imageUrl: imageData.imageUrl,
      thumbnailUrl: imageData.thumbnailUrl,
      category: imageData.category,
      author: {
        id: author.id,
        name: author.name,
        avatar: author.avatar,
        reputation: author.reputation || 0
      },
      createdAt: imageData.createdAt,
      votes: (() => {
        try {
          return JSON.parse(imageData.votes);
        } catch (e) {
          return { upvotes: 0, downvotes: 0 };
        }
      })(),
      comments: imageData.comments
    };

    console.log(`Gallery image uploaded: ${imageData.id} by ${author.name}`);

    return NextResponse.json({ 
      success: true, 
      image: formattedImage,
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
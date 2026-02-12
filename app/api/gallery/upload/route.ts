import { NextRequest, NextResponse } from 'next/server';
import { moderateImage, moderateText } from '@/lib/moderation';
import { awardXP } from '@/lib/reputation';
import { uploadToStorage, STORAGE_BUCKETS, supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';

function getTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication (cookie for web, Bearer for mobile)
    let token = getTokenFromRequest(request);
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value ?? null;
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const authResult = await getUserFromToken(token);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const authenticatedUser = authResult.user;

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;

    if (!file || !category) {
      return NextResponse.json(
        { error: 'Image and category are required' },
        { status: 400 }
      );
    }

    // Reject empty or corrupt uploads (common when mobile sends FormData with uri – file can arrive as 0 bytes)
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: 'Image file is empty. Try selecting the image again or use a different photo.' },
        { status: 400 }
      );
    }

    // Use authenticated user data instead of trusting frontend
    const author = {
      id: authenticatedUser.id,
      name: authenticatedUser.username,
      avatar: authenticatedUser.avatar || '/DefaultDiceAvatar.svg',
      reputation: authenticatedUser.reputation || authenticatedUser.xp || 0
    };

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

    const uploadResult = await uploadToStorage(
      STORAGE_BUCKETS.GALLERY,
      filename,
      buffer,
      file.type
    );
    
    if (uploadResult.error) {
      throw new Error(`Failed to upload to Supabase Storage: ${uploadResult.error}`);
    }
    
    // Generate CUID for image ID (database doesn't auto-generate)
    const timestampCuid = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestampCuid}${counter}${fingerprint}${random}`.substring(0, 25);
    
    const now = new Date().toISOString();
    
    // Create image in database using Supabase directly
    // Try camelCase first, then snake_case as fallback
    // Don't include 'views' or 'downloads' if they don't exist - let database defaults handle it
    let imageData: any = null;
    let createError: any = null;
    
    // Try camelCase first (without views/downloads to avoid schema errors)
    const { data: dataCamel, error: errorCamel } = await supabaseAdmin
      .from('gallery_images')
      .insert({
        id: generatedId,
        title: title?.trim() || (category === 'collections' ? 'Collection Photo' : 'Favorite Card'),
        description: description || '',
        imageUrl: uploadResult.publicUrl,
        thumbnailUrl: uploadResult.publicUrl,
        category,
        authorId: author.id,
        votes: JSON.stringify({ upvotes: 0, downvotes: 0 }),
        comments: 0,
        createdAt: now,
        updatedAt: now
      })
      .select('id, title, description, imageUrl, thumbnailUrl, category, votes, comments, createdAt, authorId')
      .single();
    
    if (!errorCamel && dataCamel) {
      imageData = dataCamel;
    } else {
      // Try snake_case as fallback (without views/downloads)
      console.log('CamelCase insert failed, trying snake_case:', errorCamel);
      const { data: dataSnake, error: errorSnake } = await supabaseAdmin
        .from('gallery_images')
        .insert({
          id: generatedId,
          title: title?.trim() || (category === 'collections' ? 'Collection Photo' : 'Favorite Card'),
          description: description || '',
          image_url: uploadResult.publicUrl,
          thumbnail_url: uploadResult.publicUrl,
          category,
          author_id: author.id,
          votes: JSON.stringify({ upvotes: 0, downvotes: 0 }),
          comments: 0,
          created_at: now,
          updated_at: now
        })
        .select('id, title, description, image_url, thumbnail_url, category, votes, comments, created_at, author_id')
        .single();
      
      if (!errorSnake && dataSnake) {
        // Map snake_case response to camelCase
        imageData = {
          id: dataSnake.id,
          title: dataSnake.title,
          description: dataSnake.description,
          imageUrl: dataSnake.image_url,
          thumbnailUrl: dataSnake.thumbnail_url,
          category: dataSnake.category,
          votes: dataSnake.votes,
          comments: dataSnake.comments,
          createdAt: dataSnake.created_at,
          authorId: dataSnake.author_id
        };
      } else {
        createError = errorSnake || errorCamel;
      }
    }

    if (createError || !imageData) {
      throw new Error(`Failed to create image in database: ${createError?.message || 'Unknown error'}`);
    }

    // Award XP for uploading an image (optional - don't fail upload if XP fails)
    try {
      // Check if it's a dice design upload (Dice Throne category)
      const isDiceDesign = category === 'dice-throne';
      
      const xpResult = await awardXP(
        author.id,
        author.name,
        isDiceDesign ? 'UPLOAD_DIE_DESIGN' : 'UPLOAD_IMAGE',
        imageData.id
      );
      
      // Log level up if it occurred (server-side)
      if (xpResult?.leveledUp) {
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
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFromStorage, STORAGE_BUCKETS } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorId, description } = await request.json();

    // Find the image in database
    const image = await prisma.galleryImage.findUnique({
      where: { id }
    });
    
    if (!image) {
      return NextResponse.json(
        { message: 'Image not found' },
        { status: 404 }
      );
    }

    // Check if the user is the author of the image
    if (image.authorId !== authorId) {
      return NextResponse.json(
        { message: 'You can only edit your own images' },
        { status: 403 }
      );
    }

    // Update the description
    const updatedImage = await prisma.galleryImage.update({
      where: { id },
      data: {
        description: description || ''
      }
    });

    return NextResponse.json(
      { 
        message: 'Description updated successfully',
        image: updatedImage
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating image description:', error);
    return NextResponse.json(
      { message: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorId } = await request.json();

    // Find the image in database
    const image = await prisma.galleryImage.findUnique({
      where: { id }
    });
    
    if (!image) {
      return NextResponse.json(
        { message: 'Image not found' },
        { status: 404 }
      );
    }

    // Check if the user is the author of the image
    if (image.authorId !== authorId) {
      return NextResponse.json(
        { message: 'You can only delete your own images' },
        { status: 403 }
      );
    }

    // Extract file path from imageUrl for storage deletion
    // imageUrl format: https://...supabase.co/storage/v1/object/public/gallery/...
    try {
      const urlPath = new URL(image.imageUrl).pathname;
      const filePath = urlPath.split('/gallery/')[1]; // Get path after /gallery/
      
      if (filePath) {
        // Delete from Supabase Storage
        await deleteFromStorage(STORAGE_BUCKETS.GALLERY, filePath);
        console.log(`Deleted image file from storage: ${filePath}`);
      }
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.galleryImage.delete({
      where: { id }
    });

    console.log(`Gallery image deleted: ${id} by user ${authorId}`);

    return NextResponse.json(
      { message: 'Image deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { message: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

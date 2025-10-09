import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { updateCategoryImageCounts } from '@/lib/gallery';

const dataFilePath = path.join(process.cwd(), 'data', 'gallery.json');

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { authorId, description } = await request.json();

    // Read current gallery data
    const galleryData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    const images = galleryData.images || [];

    // Find the image
    const imageIndex = images.findIndex((image: any) => image.id === id);
    
    if (imageIndex === -1) {
      return NextResponse.json(
        { message: 'Image not found' },
        { status: 404 }
      );
    }

    const image = images[imageIndex];

    // Check if the user is the author of the image
    if (image.author.id !== authorId) {
      return NextResponse.json(
        { message: 'You can only edit your own images' },
        { status: 403 }
      );
    }

    // Update the description
    images[imageIndex] = {
      ...image,
      description: description || '',
      editedAt: new Date().toISOString()
    };

    // Write back to file
    galleryData.images = images;
    fs.writeFileSync(dataFilePath, JSON.stringify(galleryData, null, 2));

    return NextResponse.json(
      { 
        message: 'Description updated successfully',
        image: images[imageIndex]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating image description:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { authorId } = await request.json();

    // Read current gallery data
    const galleryData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    const images = galleryData.images || [];

    // Find the image
    const imageIndex = images.findIndex((image: any) => image.id === id);
    
    if (imageIndex === -1) {
      return NextResponse.json(
        { message: 'Image not found' },
        { status: 404 }
      );
    }

    const image = images[imageIndex];

    // Check if the user is the author of the image
    if (image.author.id !== authorId) {
      return NextResponse.json(
        { message: 'You can only delete your own images' },
        { status: 403 }
      );
    }

    // Remove the image
    images.splice(imageIndex, 1);

    // Write back to file
    galleryData.images = images;
    fs.writeFileSync(dataFilePath, JSON.stringify(galleryData, null, 2));

    // Update category image counts
    updateCategoryImageCounts();

    return NextResponse.json(
      { message: 'Image deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, deleteFromStorage, STORAGE_BUCKETS } from '@/lib/supabase';

async function getGalleryImage(id: string) {
  const { data, error } = await supabaseAdmin
    .from('gallery_images')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Error fetching gallery image:', error);
    return null;
  }
  return data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorId, description } = await request.json();

    const image = await getGalleryImage(id);
    if (!image) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    const ownerId = image.authorId ?? image.author_id;
    if (ownerId !== authorId) {
      return NextResponse.json({ message: 'You can only edit your own images' }, { status: 403 });
    }

    const updatePayload = image.authorId !== undefined
      ? { description: description || '' }
      : { description: description || '' }; // field name is the same

    const { data: updatedImage, error: updateError } = await supabaseAdmin
      .from('gallery_images')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (updateError) {
      console.error('Error updating gallery image:', updateError);
      return NextResponse.json({ message: 'Failed to update image' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Description updated successfully', image: updatedImage }, { status: 200 });
  } catch (error) {
    console.error('Error updating image description:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorId } = await request.json();

    const image = await getGalleryImage(id);
    if (!image) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    const ownerId = image.authorId ?? image.author_id;
    if (ownerId !== authorId) {
      return NextResponse.json({ message: 'You can only delete your own images' }, { status: 403 });
    }

    try {
      const imageUrl = image.imageUrl ?? image.image_url;
      if (imageUrl) {
        const urlPath = new URL(imageUrl).pathname;
        const filePath = urlPath.split('/gallery/')[1];
        if (filePath) {
          await deleteFromStorage(STORAGE_BUCKETS.GALLERY, filePath);
          console.log(`Deleted image file from storage: ${filePath}`);
        }
      }
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('gallery_images')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting gallery image:', deleteError);
      return NextResponse.json({ message: 'Failed to delete image' }, { status: 500 });
    }

    console.log(`Gallery image deleted: ${id} by user ${authorId}`);
    return NextResponse.json({ message: 'Image deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

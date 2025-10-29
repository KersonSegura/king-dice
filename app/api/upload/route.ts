import { NextRequest, NextResponse } from 'next/server';
import { uploadToStorage, STORAGE_BUCKETS } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json(
        { error: 'Image and type are required' },
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

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `${type}-${timestamp}.${fileExtension}`;
    const filePath = filename;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const result = await uploadToStorage(
      STORAGE_BUCKETS.UPLOADS,
      filePath,
      buffer,
      file.type
    );

    if (result.error) {
      console.error('Error uploading to Supabase:', result.error);
      return NextResponse.json(
        { error: 'Failed to upload image to storage' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      url: result.publicUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

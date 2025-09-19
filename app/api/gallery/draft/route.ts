import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/gallery';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const author = JSON.parse(formData.get('author') as string);

    if (!file || !title || !category || !author) {
      return NextResponse.json(
        { error: 'Image, title, category, and author are required' },
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

    // Upload image as draft (not published)
    const imageData = await uploadImage({
      file,
      title: title.trim(),
      category,
      author,
      description: formData.get('description') as string || '',
      tags: (formData.get('tags') as string || '').split(',').map(tag => tag.trim()).filter(tag => tag),
      isDraft: true // Mark as draft
    });

    return NextResponse.json({ 
      success: true, 
      image: imageData,
      message: 'Draft created successfully'
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    );
  }
}

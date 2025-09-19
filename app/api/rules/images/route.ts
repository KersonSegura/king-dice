import { NextRequest, NextResponse } from 'next/server';
import { convertBase64ToFileReferences, convertFileReferencesToBase64, deleteImageFile, extractImagePaths } from '@/lib/fileStorage';

// Convert base64 images to file references
export async function POST(request: NextRequest) {
  try {
    const { content, gameId } = await request.json();
    
    if (!content || !gameId) {
      return NextResponse.json({ error: 'Content and gameId are required' }, { status: 400 });
    }
    
    const processedContent = convertBase64ToFileReferences(content, gameId);
    
    return NextResponse.json({ 
      success: true, 
      content: processedContent 
    });
  } catch (error) {
    console.error('Error processing images:', error);
    return NextResponse.json({ error: 'Failed to process images' }, { status: 500 });
  }
}

// Convert file references back to base64 for editing
export async function PUT(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    const processedContent = convertFileReferencesToBase64(content);
    
    return NextResponse.json({ 
      success: true, 
      content: processedContent 
    });
  } catch (error) {
    console.error('Error converting images:', error);
    return NextResponse.json({ error: 'Failed to convert images' }, { status: 500 });
  }
}

// Delete image files
export async function DELETE(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    const imagePaths = extractImagePaths(content);
    imagePaths.forEach(deleteImageFile);
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: imagePaths.length 
    });
  } catch (error) {
    console.error('Error deleting images:', error);
    return NextResponse.json({ error: 'Failed to delete images' }, { status: 500 });
  }
}

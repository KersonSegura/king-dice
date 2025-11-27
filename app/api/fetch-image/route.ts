import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json({ 
        success: false,
        error: 'Image URL is required' 
      }, { status: 400 });
    }

    // Validate URL format
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch (err) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid image URL format' 
      }, { status: 400 });
    }

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json({ 
        success: false,
        error: 'Only HTTP and HTTPS URLs are allowed' 
      }, { status: 400 });
    }

    // Fetch the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KingDice/1.0)',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return NextResponse.json({ 
          success: false,
          error: `Failed to fetch image: HTTP ${response.status}` 
        }, { status: response.status });
      }

      // Check if it's actually an image
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return NextResponse.json({ 
          success: false,
          error: 'URL does not point to an image' 
        }, { status: 400 });
      }

      // Get the image data
      const imageBuffer = await response.arrayBuffer();
      
      // Check size limit (10MB)
      if (imageBuffer.byteLength > 10 * 1024 * 1024) {
        return NextResponse.json({ 
          success: false,
          error: 'Image is too large (max 10MB)' 
        }, { status: 400 });
      }
      
      // Convert to base64
      const base64 = Buffer.from(imageBuffer).toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      return NextResponse.json({ 
        success: true, 
        dataUrl,
        contentType 
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          success: false,
          error: 'Request timeout - image took too long to fetch' 
        }, { status: 408 });
      }
      
      throw fetchError;
    }
    
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

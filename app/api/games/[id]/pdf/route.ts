import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, uploadToStorage, STORAGE_BUCKETS } from '@/lib/supabase';

// Configure for longer execution time and larger body size
export const maxDuration = 60; // 60 seconds for large file uploads
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const gameId = parseInt(idString);
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Check if game exists
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Get the uploaded file
    let formData;
    try {
      formData = await request.formData();
    } catch (formDataError) {
      console.error('Error parsing FormData:', formDataError);
      // Check if it's a size-related error
      if (formDataError instanceof Error && formDataError.message.includes('size')) {
        return NextResponse.json(
          { error: 'File is too large. Maximum allowed is 50MB. Please try a smaller file or use a PDF URL instead.' },
          { status: 413 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to parse form data. Please try again.' },
        { status: 400 }
      );
    }
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Validate file size
    // Locally: 15MB limit (no Vercel restrictions)
    // On Vercel: 4.5MB body size limit, so ~3MB files work
    // Supabase Storage: 50MB limit
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    const maxFileSize = isProduction ? 3 * 1024 * 1024 : 15 * 1024 * 1024; // 3MB on Vercel, 15MB locally
    
    if (file.size > maxFileSize) {
      const maxSizeMB = isProduction ? 3 : 15;
      return NextResponse.json(
        { error: `File size must be less than ${maxSizeMB}MB. For larger files, please use the PDF URL field instead.` },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage instead of base64
    const timestamp = Date.now();
    const filename = `game-${gameId}-${timestamp}.pdf`;
    const filePath = `PDFs/${filename}`;
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const uploadResult = await uploadToStorage(
      STORAGE_BUCKETS.PDFS,
      filePath,
      buffer,
      'application/pdf'
    );

    if (uploadResult.error) {
      console.error('Error uploading PDF to Supabase Storage:', uploadResult.error);
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage', details: uploadResult.error },
        { status: 500 }
      );
    }

    // Update game with PDF URL (from Supabase Storage)
    // Use camelCase column names (pdfUrl, pdfFile)
    const { data: updatedGame, error: updateError } = await supabaseAdmin
      .from('games')
      .update({
        pdfUrl: uploadResult.publicUrl, // Store the Supabase Storage URL
        pdfFile: null // Clear base64 file if it exists
      })
      .eq('id', gameId)
      .select('id, nameEn, pdfUrl')
      .single();

    if (updateError || !updatedGame) {
      console.error('Error updating game with PDF:', updateError);
      return NextResponse.json(
        { error: 'Failed to update game with PDF' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'PDF uploaded successfully to Supabase Storage',
      game: {
        id: updatedGame.id,
        nameEn: updatedGame.nameEn,
        pdfUrl: updatedGame.pdfUrl
      }
    });

  } catch (error) {
    console.error('Error uploading PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const gameId = parseInt(idString);
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    const { pdfUrl } = await request.json();

    if (!pdfUrl || typeof pdfUrl !== 'string') {
      return NextResponse.json(
        { error: 'PDF URL is required' },
        { status: 400 }
      );
    }

    // Update game with PDF URL
    const { data: updatedGame, error: updateError } = await supabaseAdmin
      .from('games')
      .update({
        pdfUrl: pdfUrl,
        pdfFile: null // Clear base64 file if it exists
      })
      .eq('id', gameId)
      .select('id, nameEn, pdfUrl')
      .single();

    if (updateError || !updatedGame) {
      console.error('Error updating game with PDF:', updateError);
      return NextResponse.json(
        { error: 'Failed to update game with PDF' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'PDF URL updated successfully',
      game: {
        id: updatedGame.id,
        nameEn: updatedGame.nameEn,
        pdfUrl: updatedGame.pdfUrl
      }
    });

  } catch (error) {
    console.error('Error updating PDF URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const gameId = parseInt(idString);
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Get the game with PDF file - select all columns to handle both naming conventions
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      console.error('[PDF API] Error fetching game:', gameError);
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Handle both naming conventions for PDF fields
    const pdfFile = (game as any).pdfFile ?? (game as any).pdf_file;
    const pdfUrl = (game as any).pdfUrl ?? (game as any).pdf_url;
    
    console.log('[PDF API] PDF fields:', {
      gameId,
      hasPdfFile: !!pdfFile,
      hasPdfUrl: !!pdfUrl,
      pdfFileLength: pdfFile ? pdfFile.length : 0,
      pdfUrlValue: pdfUrl
    });

    // Priority: PDF URL (Supabase Storage or external) > base64 file
    if (pdfUrl) {
      // If it's a Supabase Storage URL or external URL, redirect to it
      return NextResponse.redirect(pdfUrl);
    }
    
    // Fallback: If we have a PDF file (base64), serve it (legacy support)
    if (pdfFile) {
      // Convert base64 back to buffer
      const base64Data = pdfFile.replace(/^data:application\/pdf;base64,/, '');
      const pdfBuffer = Buffer.from(base64Data, 'base64');

      // Get game name for filename - handle both naming conventions
      const gameName = ((game as any).nameEn ?? (game as any).name_en ?? (game as any).name) || 'game';

      // Return PDF with proper headers
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${gameName}-rules.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // No PDF found
    console.warn('[PDF API] No PDF file or URL found for game ID:', gameId);
    return NextResponse.json(
      { error: 'PDF not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('[PDF API] Error serving PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

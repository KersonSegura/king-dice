import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    const formData = await request.formData();
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

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 15MB' },
        { status: 400 }
      );
    }

    // Convert file to base64 for storage
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const pdfData = `data:application/pdf;base64,${base64}`;

    // Update game with PDF file
    const { data: updatedGame, error: updateError } = await supabaseAdmin
      .from('games')
      .update({
        pdf_file: pdfData,
        pdf_url: null // Clear external URL since we now have the file
      })
      .eq('id', gameId)
      .select('id, name_en, pdf_file')
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
      message: 'PDF uploaded successfully',
      game: {
        id: updatedGame.id,
        nameEn: updatedGame.name_en,
        hasPdfFile: !!updatedGame.pdf_file
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

    // If we have a PDF file (base64), serve it
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
    
    // If we have a PDF URL, redirect to it
    if (pdfUrl) {
      return NextResponse.redirect(pdfUrl);
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

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

    // Get the game to find the bggId
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('bgg_id, name_en')
      .eq('id', gameId)
      .single();

    if (gameError || !game || !game.bgg_id) {
      return NextResponse.json(
        { error: 'Game not found or missing BGG ID' },
        { status: 404 }
      );
    }

    // Fetch the BGG files page to get the latest PDF URL
    const response = await fetch(`https://boardgamegeek.com/boardgame/${game.bgg_id}/files`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch BGG files page');
    }

    const html = await response.text();
    
    // Extract PDF URLs from the page
    const pdfUrls: string[] = [];
    
    // Look for PDF links - BGG links to files look like /geekdo-files.com/*/filename.pdf
    const pdfRegex = /href="(https?:\/\/[^"]*\.pdf[^"]*)"/gi;
    let match;
    
    while ((match = pdfRegex.exec(html)) !== null) {
      pdfUrls.push(match[1]);
    }

    if (pdfUrls.length === 0) {
      // Fallback: try to find links to geekdo-files.com
      const geekdoRegex = /href="(https?:\/\/[^"]*geekdo-files\.com[^"]*)"\s+[^>]*>(.*?rulebook.*?)<\/a>/gi;
      while ((match = geekdoRegex.exec(html)) !== null) {
        pdfUrls.push(match[1]);
      }
    }

    return NextResponse.json({
      pdfUrl: pdfUrls[0] || null,
      allPdfUrls: pdfUrls,
      bggId: game.bgg_id // Return BGG ID for fallback
    });

  } catch (error) {
    console.error('Error fetching PDF URL:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDF URL from BGG' },
      { status: 500 }
    );
  }
}


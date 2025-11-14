import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('id');
    
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    // Read the games list to find the image file for this game ID
    const gamesListPath = path.join(process.cwd(), 'image-mode-games-list.txt');
    const gamesListContent = fs.readFileSync(gamesListPath, 'utf-8');
    
    // Find the game by ID (assuming ID is the index in the list)
    const games = gamesListContent
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => {
        const [name, imageFileName] = line.split(' -> ').map((part: string) => part.trim());
        return { name, imageFileName };
      })
      .filter((game: any) => game.name && game.imageFileName);

    const gameIndex = parseInt(gameId);
    if (isNaN(gameIndex) || gameIndex < 0 || gameIndex >= games.length) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 404 });
    }

    const game = games[gameIndex];

    // Serve from Supabase Storage instead of local filesystem
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json({ error: 'SUPABASE_URL is not configured' }, { status: 500 });
    }

    // Files live in bucket "boardle-images" at path "boardle-images/<filename>"
    // Note: Files were migrated with the bucket name as a prefix, so they're at boardle-images/<filename>
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/boardle-images/boardle-images/${game.imageFileName}`;

    console.log(`🖼️ Boardle image-proxy: Game ID ${gameId} (${game.name}) -> ${game.imageFileName}`);
    console.log(`🔗 Redirecting to: ${publicUrl}`);

    // Redirect the client to the public URL (allows CDN caching)
    return NextResponse.redirect(publicUrl, { status: 307 });

  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ 
      error: 'Failed to serve image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('id');
    
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    // Read the games list to find the image file for this game ID
    const gamesListPath = path.join(process.cwd(), 'card-mode-games-list.txt');
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
    const imagePath = path.join(process.cwd(), 'public', 'boardle-images', 'cards', game.imageFileName);
    
    // Check if image exists
    if (!fs.existsSync(imagePath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Determine content type based on file extension
    const ext = path.extname(game.imageFileName).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        'Content-Length': imageBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error serving card image:', error);
    return NextResponse.json({ 
      error: 'Failed to serve card image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Search users and games
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // 'all', 'users', 'games'
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        users: [], 
        games: [], 
        total: 0 
      });
    }

    const searchQuery = query.trim();

    // Search users
    let users: any[] = [];
    if (type === 'all' || type === 'users') {
      try {
        users = await prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: searchQuery } },
              { email: { contains: searchQuery } }
            ]
          },
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            isVerified: true,
            isAdmin: true,
            createdAt: true
          },
          take: limit,
          orderBy: { username: 'asc' }
        });
      } catch (error) {
        console.error('Error searching users:', error);
        users = [];
      }
    }

    // Search games from database
    let games: any[] = [];
    if (type === 'all' || type === 'games') {
      try {
        const dbGames = await prisma.game.findMany({
          where: {
            OR: [
              { nameEn: { contains: searchQuery } },
              { nameEs: { contains: searchQuery } },
              { name: { contains: searchQuery } }
            ]
          },
          select: {
            id: true,
            nameEn: true,
            nameEs: true,
            name: true,
            yearRelease: true,
            year: true,
            minPlayers: true,
            maxPlayers: true,
            durationMinutes: true,
            thumbnailUrl: true,
            imageUrl: true
          },
          take: limit,
          orderBy: { nameEn: 'asc' }
        });

        games = dbGames.map(game => ({
          id: game.id.toString(),
          name: game.nameEn || game.name || 'Unknown Game',
          year: game.yearRelease || game.year,
          players: game.minPlayers && game.maxPlayers 
            ? (game.minPlayers === game.maxPlayers 
                ? `${game.minPlayers}` 
                : `${game.minPlayers}-${game.maxPlayers}`)
            : 'Unknown',
          duration: game.durationMinutes ? `${game.durationMinutes} min` : 'Unknown',
          image: game.thumbnailUrl || game.imageUrl,
          type: 'game'
        }));
      } catch (error) {
        console.error('Error searching games:', error);
        games = [];
      }
    }

    // Add some mock users for testing if no real users found
    if (users.length === 0 && (type === 'all' || type === 'users')) {
      const mockUsers = [
        {
          id: 'mock1',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
          isVerified: false,
          isAdmin: false,
          createdAt: new Date().toISOString(),
          type: 'user'
        },
        {
          id: 'mock2',
          username: 'admin',
          email: 'admin@example.com',
          avatar: null,
          isVerified: true,
          isAdmin: true,
          createdAt: new Date().toISOString(),
          type: 'user'
        }
      ];
      
      const matchingUsers = mockUsers.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (matchingUsers.length > 0) {
        users = matchingUsers;
      }
    }

    return NextResponse.json({
      users,
      games,
      total: users.length + games.length,
      query: searchQuery
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

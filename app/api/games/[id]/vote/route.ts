import { NextRequest, NextResponse } from 'next/server';
import { awardXP } from '@/lib/reputation';

// Almacenamiento temporal de votos (en memoria)
const tempVotes = new Map<string, { rating: number; userId: string }>();


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = parseInt(params.id);
    const { rating, userId } = await request.json();

    // Validaciones
    if (!rating || rating < 1 || rating > 10) {
      return NextResponse.json(
        { error: 'Rating debe estar entre 1 y 10' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Se requiere userId' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya votó
    const voteKey = `${gameId}-${userId}`;
    if (tempVotes.has(voteKey)) {
      return NextResponse.json(
        { error: 'Ya has votado por este juego' },
        { status: 400 }
      );
    }

    // Registrar el voto
    tempVotes.set(voteKey, { rating, userId });

    // Award XP for voting (we need username, but we'll use userId as fallback)
    try {
      awardXP(userId, userId, 'VOTE_GAME', gameId.toString());
    } catch (error) {
      console.error('Error awarding XP for game vote:', error);
    }

    // Calcular nuevo rating promedio
    const gameVotes = Array.from(tempVotes.entries())
      .filter(([key]) => key.startsWith(`${gameId}-`))
      .map(([, vote]) => vote.rating);

    const totalRating = gameVotes.reduce((sum, vote) => sum + vote, 0);
    const averageRating = gameVotes.length > 0 ? totalRating / gameVotes.length : 0;

    return NextResponse.json({
      success: true,
      message: 'Voto registrado exitosamente',
      newRating: averageRating,
      totalVotes: gameVotes.length
    });

  } catch (error) {
    console.error('Error procesando voto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Se requiere userId' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya votó
    const voteKey = `${gameId}-${userId}`;
    const existingVote = tempVotes.get(voteKey);

    return NextResponse.json({
      hasVoted: !!existingVote,
      userRating: existingVote?.rating || null
    });

  } catch (error) {
    console.error('Error verificando voto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 
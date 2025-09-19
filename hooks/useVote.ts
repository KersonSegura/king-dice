import { useState, useEffect } from 'react';

interface UseVoteProps {
  gameId: number;
  userId: string;
}

interface VoteState {
  hasVoted: boolean;
  userRating: number | null;
  isLoading: boolean;
  error: string | null;
}

export function useVote({ gameId, userId }: UseVoteProps) {
  const [voteState, setVoteState] = useState<VoteState>({
    hasVoted: false,
    userRating: null,
    isLoading: true,
    error: null
  });

  // Verificar si el usuario ya votó
  useEffect(() => {
    const checkVoteStatus = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/vote?userId=${userId}`);
        const data = await response.json();

        if (response.ok) {
          setVoteState(prev => ({
            ...prev,
            hasVoted: data.hasVoted,
            userRating: data.userRating,
            isLoading: false
          }));
        } else {
          setVoteState(prev => ({
            ...prev,
            error: data.error,
            isLoading: false
          }));
        }
      } catch (error) {
        setVoteState(prev => ({
          ...prev,
          error: 'Error al verificar estado del voto',
          isLoading: false
        }));
      }
    };

    if (gameId && userId) {
      checkVoteStatus();
    }
  }, [gameId, userId]);

  // Función para enviar voto
  const submitVote = async (rating: number): Promise<void> => {
    try {
      setVoteState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`/api/games/${gameId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          userId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setVoteState(prev => ({
          ...prev,
          hasVoted: true,
          userRating: rating,
          isLoading: false
        }));
      } else {
        setVoteState(prev => ({
          ...prev,
          error: data.error,
          isLoading: false
        }));
        throw new Error(data.error);
      }
    } catch (error) {
      setVoteState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al enviar voto',
        isLoading: false
      }));
      throw error;
    }
  };

  return {
    ...voteState,
    submitVote
  };
} 
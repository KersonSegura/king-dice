import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import WebViewScreen from '../../components/WebViewScreen';

export default function GameDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameId = Array.isArray(id) ? id[0] : id;

  // Redirect to all-games if no valid id (same as website 404 flow)
  useEffect(() => {
    if (!gameId || gameId === 'undefined' || gameId === 'null') {
      router.replace('/search');
    }
  }, [gameId, router]);

  if (!gameId || gameId === 'undefined' || gameId === 'null') {
    return null; // Will redirect
  }

  return (
    <WebViewScreen
      path={`/game/${gameId}`}
      title="Game"
      interceptGameLinks={false}
      disableScrollNav
    />
  );
}

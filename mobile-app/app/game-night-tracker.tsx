import WebViewScreen from '../components/WebViewScreen';
import { useLocalSearchParams } from 'expo-router';

export default function GameNightTracker() {
  const params = useLocalSearchParams<{
    share?: string | string[];
  }>();

  const shareParam = Array.isArray(params.share) ? params.share[0] : params.share;

  const path = shareParam
    ? `/game-night-tracker?share=${encodeURIComponent(shareParam)}`
    : '/game-night-tracker';

  return <WebViewScreen path={path} title="Game Night Tracker" />;
}

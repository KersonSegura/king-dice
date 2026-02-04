import WebViewScreen from '../components/WebViewScreen';
import { useAuth } from '../contexts/AuthContext';

export default function MyDice() {
  const { verifyAuth } = useAuth();

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'KD_AVATAR_SAVED') {
        verifyAuth({ silent: true }).catch(() => {});
      }
    } catch {
      // Ignore non-JSON messages
    }
  };

  return <WebViewScreen path="/my-dice" title="My Dice" onMessage={handleMessage} />;
}

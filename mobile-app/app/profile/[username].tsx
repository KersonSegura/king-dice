import { useLocalSearchParams } from 'expo-router';
import WebViewScreen from '../../components/WebViewScreen';

export default function ProfileByUsername() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const u = Array.isArray(username) ? username[0] : username;
  return <WebViewScreen path={`/profile/${u || ''}`} title={u || 'Profile'} disableScrollNav />;
}

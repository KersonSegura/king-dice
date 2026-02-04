import { useLocalSearchParams } from 'expo-router';
import WebViewScreen from '../../components/WebViewScreen';

export default function CollectionByUsername() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const u = Array.isArray(username) ? username[0] : username;
  return <WebViewScreen path={`/collection/${u || ''}`} title={u ? `${u}'s Collection` : 'Collection'} />;
}

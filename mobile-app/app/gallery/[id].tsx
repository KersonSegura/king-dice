import WebViewScreen from '../../components/WebViewScreen';
import { useLocalSearchParams } from 'expo-router';

export default function GalleryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Website uses community-gallery with ?image=id to open specific image
  const path = id ? `/community-gallery?image=${encodeURIComponent(id)}` : '/community-gallery';
  return <WebViewScreen path={path} title="Gallery" />;
}

/**
 * Forums (website) – matches mobile nav.
 */

import WebViewScreen from '../../components/WebViewScreen';

export default function FeedScreen() {
  return <WebViewScreen path="/feed" title="Community Feed" showHeader={false} hideWebHeader />;
}

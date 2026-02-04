/**
 * Home (website) – exact mobile view with bottom nav.
 */

import WebViewScreen from '../../components/WebViewScreen';

export default function HomeScreen() {
  return <WebViewScreen path="/" title="Home" showHeader={false} hideWebHeader />;
}

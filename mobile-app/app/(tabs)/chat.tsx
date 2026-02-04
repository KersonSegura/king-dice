/**
 * Chat – dedicated full-page chat route (no popup).
 */

import WebViewScreen from '../../components/WebViewScreen';

export default function ChatScreen() {
  return <WebViewScreen path="/chat" title="Chat" showHeader={false} hideWebHeader />;
}

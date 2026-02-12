import { headers } from 'next/headers';
import ChatPage from '@/components/ChatPage';

/** Chat route. In the app (embed=1) we pass embed so ChatPage renders the full-page app chat (no floating button, no popups). */
export default async function ChatRoute() {
  let isEmbed = false;
  try {
    const hdrs = await headers();
    isEmbed = hdrs.get('x-kd-embed') === '1';
  } catch {
    // ignore
  }
  return <ChatPage embed={isEmbed} />;
}

/**
 * Minimal layout for embed pages (e.g. login dice).
 * No extra chrome - just the page content.
 * Override icons with a data URI so the WebView never requests /favicon.ico
 * (failed favicon request often shows as broken image icon in WebView).
 */
export const metadata = {
  icons: {
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 m-0 bg-white">
      {children}
    </div>
  );
}

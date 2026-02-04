'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import HomePageFooter from './HomePageFooter';

/** Renders footer only when not in embed mode (mobile app WebView) to avoid hydration mismatch */
function EmbedAwareFooterInner() {
  const searchParams = useSearchParams();
  const isEmbed = searchParams?.get('embed') === '1';
  if (isEmbed) return null;
  return (
    <div className="mt-auto">
      <HomePageFooter />
    </div>
  );
}

export default function EmbedAwareFooter() {
  return (
    <Suspense fallback={null}>
      <EmbedAwareFooterInner />
    </Suspense>
  );
}

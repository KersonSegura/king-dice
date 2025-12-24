import { Suspense } from 'react';
import ShopPageClient from './ShopPageClient';
import LoadingScreen from '@/components/LoadingScreen';

export default function ShopPage() {
  // Wrap client-side URL hooks (useSearchParams) in Suspense to satisfy Next.js prerender requirements.
  return (
    <Suspense fallback={<LoadingScreen message="Loading Shop" />}>
      <ShopPageClient />
    </Suspense>
  );
}


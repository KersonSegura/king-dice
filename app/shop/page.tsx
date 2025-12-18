import { Suspense } from 'react';
import ShopPageClient from './ShopPageClient';

export default function ShopPage() {
  // Wrap client-side URL hooks (useSearchParams) in Suspense to satisfy Next.js prerender requirements.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p className="mt-4 text-gray-600">Loading shop...</p>
          </div>
        </div>
      }
    >
      <ShopPageClient />
    </Suspense>
  );
}


import { Suspense } from 'react';
import ShopPageClient from './ShopPageClient';
import LoadingScreen from '@/components/LoadingScreen';
import { getTranslations } from 'next-intl/server';

async function ShopPageSuspenseFallback() {
  const t = await getTranslations('shop');
  return <LoadingScreen message={t('loading')} />;
}

export default function ShopPage() {
  // Wrap client-side URL hooks (useSearchParams) in Suspense to satisfy Next.js prerender requirements.
  return (
    <Suspense fallback={<ShopPageSuspenseFallback />}>
      <ShopPageClient />
    </Suspense>
  );
}


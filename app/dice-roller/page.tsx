'use client';

import DiceRoller from '@/components/dice/DiceRoller';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export const dynamic = 'force-dynamic';

export default function DiceRollerPage() {
  const t = useTranslations('common');
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header with back button - hidden in embed (mobile has home in nav) */}
      <div className="kd-back-to-home bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('backToHome')}
          </Link>
        </div>
      </div>
      <div className="flex-1">
        <DiceRoller />
      </div>
    </div>
  );
}


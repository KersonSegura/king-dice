'use client';

import React from 'react';
import { Shield, AlertTriangle, Mail } from 'lucide-react';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

export default function ChildSafetyPage() {
  const t = useTranslations('childSafety');
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-amber-200" />
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-xl text-amber-100 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Commitment */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 text-amber-600 mr-3" />
            {t('commitment.title')}
          </h2>
          <p className="text-gray-700 mb-6">{t('commitment.intro')}</p>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-amber-600 mr-2 font-bold">•</span>
              <span>{t('commitment.point1')}</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-600 mr-2 font-bold">•</span>
              <span>{t('commitment.point2')}</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-600 mr-2 font-bold">•</span>
              <span>{t('commitment.point3')}</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-600 mr-2 font-bold">•</span>
              <span>{t('commitment.point4')}</span>
            </li>
          </ul>
        </section>

        {/* Reporting */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            {t('reporting.title')}
          </h2>
          <p className="text-gray-700 mb-4">{t('reporting.intro')}</p>
          <div className="space-y-4 text-gray-700">
            <p>{t('reporting.inApp')}</p>
            <p>{t('reporting.email')}</p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start">
            <Mail className="w-6 h-6 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-900 font-medium">{t('contact')}</p>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

'use client';

import React from 'react';
import { Trash2, Mail, Shield, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Footer from '@/components/Footer';

export default function DataDeletionPage() {
  const t = useTranslations('dataDeletion');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Trash2 className="w-16 h-16 mx-auto mb-4 text-red-200" />
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Right to Deletion */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-start space-x-4 mb-6">
            <Shield className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('right.title')}</h2>
              <p className="text-gray-600">{t('right.description')}</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('how.title')}</h2>
          <ol className="space-y-4 text-gray-700">
            <li className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold mr-4 flex-shrink-0">
                1
              </div>
              <span>{t('how.step1')}</span>
            </li>
            <li className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold mr-4 flex-shrink-0">
                2
              </div>
              <span>{t('how.step2')}</span>
            </li>
            <li className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold mr-4 flex-shrink-0">
                3
              </div>
              <span>{t('how.step3')}</span>
            </li>
            <li className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold mr-4 flex-shrink-0">
                4
              </div>
              <span>{t('how.step4')}</span>
            </li>
            <li className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold mr-4 flex-shrink-0">
                5
              </div>
              <span>{t('how.step5')}</span>
            </li>
            <li className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold mr-4 flex-shrink-0">
                6
              </div>
              <span>{t('how.step6')}</span>
            </li>
          </ol>
        </div>

        {/* Email alternative */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('emailAlt.title')}</h2>
          <p className="text-gray-600 mb-4">{t('emailAlt.description')}</p>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <Mail className="w-5 h-5 text-gray-600 mr-2" />
              <span className="font-semibold text-gray-900">{t('emailAlt.sendTo')}</span>
            </div>
            <a href="mailto:support@kingdice.gg" className="text-blue-600 hover:text-blue-800 underline">
              support@kingdice.gg
            </a>
            <div className="mt-4">
              <p className="font-semibold text-gray-900 mb-2">{t('emailAlt.include')}</p>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>• {t('emailAlt.item1')}</li>
                <li>• {t('emailAlt.item2')}</li>
                <li>• {t('emailAlt.item3')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* What will be deleted */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('whatDeleted.title')}</h2>
          <p className="text-gray-600 mb-4">{t('whatDeleted.description')}</p>
          <ul className="text-gray-700 space-y-2 ml-4">
            <li>• {t('whatDeleted.item1')}</li>
            <li>• {t('whatDeleted.item2')}</li>
            <li>• {t('whatDeleted.item3')}</li>
            <li>• {t('whatDeleted.item4')}</li>
            <li>• {t('whatDeleted.item5')}</li>
            <li>• {t('whatDeleted.item6')}</li>
            <li>• {t('whatDeleted.item7')}</li>
          </ul>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-800 text-sm">{t('whatDeleted.note')}</p>
            </div>
          </div>
        </div>

        {/* Processing time */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('processing.title')}</h2>
          <p className="text-gray-700">
            {t('processing.description')}{' '}
            <strong>{t('processing.time')}</strong>.
          </p>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('questions.title')}</h2>
          <p className="text-gray-600 mb-4">{t('questions.description')}</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">{t('questions.emailTitle')}</h3>
              <a href="mailto:support@kingdice.gg" className="text-blue-600 hover:text-blue-800 underline">
                support@kingdice.gg
              </a>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">{t('questions.responseTitle')}</h3>
              <p className="text-gray-700">{t('questions.responseValue')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}


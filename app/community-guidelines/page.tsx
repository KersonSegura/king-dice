'use client';

import React from 'react';
import { Users, Shield, AlertTriangle, CheckCircle, XCircle, Flag, MessageSquare } from 'lucide-react';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

export default function CommunityGuidelinesPage() {
  const t = useTranslations('communityGuidelinesPage');
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-green-200" />
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Welcome Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <Shield className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-green-900 mb-3">{t('welcome.title')}</h2>
              <p className="text-green-800">
                {t('welcome.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Allowed Content */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            {t('allowed.title')}
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">{t('allowed.description')}</p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-3">✓</span>
                <span className="text-gray-700">{t('allowed.point1')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3">✓</span>
                <span className="text-gray-700">{t('allowed.point2')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3">✓</span>
                <span className="text-gray-700">{t('allowed.point3')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3">✓</span>
                <span className="text-gray-700">{t('allowed.point4')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3">✓</span>
                <span className="text-gray-700">{t('allowed.point5')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3">✓</span>
                <span className="text-gray-700">{t('allowed.point6')}</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Prohibited Content */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <XCircle className="w-6 h-6 text-red-600 mr-3" />
            {t('prohibited.title')}
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">{t('prohibited.description')}</p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-red-500 mr-3">✗</span>
                <span className="text-gray-700">{t('prohibited.point1')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3">✗</span>
                <span className="text-gray-700">{t('prohibited.point2')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3">✗</span>
                <span className="text-gray-700">{t('prohibited.point3')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3">✗</span>
                <span className="text-gray-700">{t('prohibited.point4')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3">✗</span>
                <span className="text-gray-700">{t('prohibited.point5')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3">✗</span>
                <span className="text-gray-700">{t('prohibited.point6')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3">✗</span>
                <span className="text-gray-700">{t('prohibited.point7')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3">✗</span>
                <span className="text-gray-700">{t('prohibited.point8')}</span>
              </li>
            </ul>
          </div>
        </section>

        {/* User Interactions */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <MessageSquare className="w-6 h-6 text-blue-600 mr-3" />
            {t('interactions.title')}
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('interactions.respect.title')}</h3>
              <p className="text-gray-600">{t('interactions.respect.description')}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('interactions.blocking.title')}</h3>
              <p className="text-gray-600">{t('interactions.blocking.description')}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('interactions.reporting.title')}</h3>
              <p className="text-gray-600">{t('interactions.reporting.description')}</p>
            </div>
          </div>
        </section>

        {/* Reporting & Moderation */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Flag className="w-6 h-6 text-orange-600 mr-3" />
            {t('moderation.title')}
          </h2>
          
          <div className="space-y-6">
            <p className="text-gray-600">{t('moderation.description')}</p>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">{t('moderation.howToReport.title')}</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• {t('moderation.howToReport.point1')}</li>
                <li>• {t('moderation.howToReport.point2')}</li>
                <li>• {t('moderation.howToReport.point3')}</li>
              </ul>
            </div>
            
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">{t('moderation.response.title')}</h3>
              <p className="text-gray-600">{t('moderation.response.description')}</p>
            </div>
          </div>
        </section>

        {/* Consequences */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3" />
            {t('consequences.title')}
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">{t('consequences.description')}</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">{t('consequences.firstOffense.title')}</h3>
                <p className="text-yellow-800 text-sm">{t('consequences.firstOffense.description')}</p>
              </div>
              
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">{t('consequences.repeat.title')}</h3>
                <p className="text-orange-800 text-sm">{t('consequences.repeat.description')}</p>
              </div>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-2">{t('consequences.severe.title')}</h3>
                <p className="text-red-800 text-sm">{t('consequences.severe.description')}</p>
              </div>
              
              <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{t('consequences.permanent.title')}</h3>
                <p className="text-gray-700 text-sm">{t('consequences.permanent.description')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('contact.title')}</h2>
          <p className="text-gray-600 mb-4">{t('contact.description')}</p>
          <p className="text-gray-700">
            <strong>{t('contact.email')}:</strong>{' '}
            <a href="mailto:support@kingdice.gg" className="text-primary-500 hover:underline">
              support@kingdice.gg
            </a>
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
}

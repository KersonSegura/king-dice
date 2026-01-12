'use client';

import React from 'react';
import { Heart, Code, Database, Users, Mail, Github } from 'lucide-react';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

export default function CreditsPage() {
  const t = useTranslations('credits');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-indigo-200" />
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Development Team */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="w-6 h-6 text-gray-600 mr-3" />
            {t('team.title')}
          </h2>
          <p className="text-gray-600">
            {t('team.description')}
          </p>
        </section>

        {/* Technologies */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Code className="w-6 h-6 text-gray-600 mr-3" />
            {t('technologies.title')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('technologies.description')}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-gray-700">• {t('technologies.nextjs')}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-gray-700">• {t('technologies.react')}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-gray-700">• {t('technologies.typescript')}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-gray-700">• {t('technologies.tailwind')}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-gray-700">• {t('technologies.supabase')}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-gray-700">• {t('technologies.vercel')}</p>
            </div>
          </div>
        </section>

        {/* Resources */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Database className="w-6 h-6 text-gray-600 mr-3" />
            {t('resources.title')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('resources.description')}
          </p>
          <div className="space-y-3">
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-gray-700">• {t('resources.boardgamegeek')}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-gray-700">• {t('resources.publishers')}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-gray-700">• {t('resources.community')}</p>
            </div>
          </div>
        </section>

        {/* Special Thanks */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Heart className="w-6 h-6 text-red-600 mr-3" />
            {t('specialThanks.title')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('specialThanks.description')}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-pink-800">• {t('specialThanks.community')}</p>
            </div>
            <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-pink-800">• {t('specialThanks.contributors')}</p>
            </div>
            <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-pink-800">• {t('specialThanks.testers')}</p>
            </div>
            <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-pink-800">• {t('specialThanks.feedback')}</p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Mail className="w-6 h-6 text-gray-600 mr-3" />
            {t('contact.title')}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('contact.description')}
          </p>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              {t('contact.email')} <a href="mailto:support@kingdice.gg" className="text-blue-600 hover:text-blue-800 underline font-semibold">support@kingdice.gg</a>{' '}
              {t('contact.orVisit')} <a href="https://github.com/KersonSegura/king-dice" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-semibold flex items-center gap-1 inline-flex">
                <Github className="w-4 h-4" />
                {t('contact.github')}
              </a>
            </p>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

'use client';

import React from 'react';
import { Shield, Users, Heart, AlertTriangle, CheckCircle, Award, MessageSquare, Camera, Star, Ban } from 'lucide-react';
// import BackToTopButton from '@/components/BackToTopButton'; // Removed - using global one from layout
import Footer from '@/components/Footer';
import { useTranslations, useLocale } from 'next-intl';

export default function CommunityRulesPage() {
  const t = useTranslations('communityRules');
  const locale = useLocale();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-green-200" />
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Welcome Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <Heart className="w-6 h-6 text-blue-600 mr-3 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-blue-900 mb-3">{t('welcome.title')}</h2>
              <p className="text-blue-800">
                {t('welcome.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="w-6 h-6 text-gray-600 mr-3" />
            {t('values.title')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                  <Heart className="w-4 h-4 mr-2" />
                  {t('values.respect.title')}
                </h3>
                <p className="text-green-700 text-sm">
                  {t('values.respect.description')}
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('values.helpful.title')}
                </h3>
                <p className="text-blue-700 text-sm">
                  {t('values.helpful.description')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
                  <Star className="w-4 h-4 mr-2" />
                  {t('values.quality.title')}
                </h3>
                <p className="text-purple-700 text-sm">
                  {t('values.quality.description')}
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  {t('values.safe.title')}
                </h3>
                <p className="text-orange-700 text-sm">
                  {t('values.safe.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Allowed Content */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            {t('encouraged.title')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
                {t('encouraged.discussion.title')}
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.discussion.point1')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.discussion.point2')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.discussion.point3')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.discussion.point4')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.discussion.point5')}</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Camera className="w-5 h-5 text-purple-600 mr-2" />
                {t('encouraged.visual.title')}
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.visual.point1')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.visual.point2')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.visual.point3')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.visual.point4')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.visual.point5')}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 text-green-600 mr-2" />
              {t('encouraged.activities.title')}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.activities.point1')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.activities.point2')}</span>
                </li>
              </ul>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.activities.point3')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.activities.point4')}</span>
                </li>
              </ul>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.activities.point5')}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('encouraged.activities.point6')}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Prohibited Content */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            {t('prohibited.title')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('prohibited.harmful.title')}</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.harmful.point1')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.harmful.point2')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.harmful.point3')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.harmful.point4')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.harmful.point5')}</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('prohibited.spam.title')}</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.spam.point1')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.spam.point2')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.spam.point3')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.spam.point4')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.spam.point5')}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('prohibited.account.title')}</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.account.point1')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.account.point2')}</span>
                </li>
              </ul>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.account.point3')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.account.point4')}</span>
                </li>
              </ul>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.account.point5')}</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{t('prohibited.account.point6')}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Reputation System */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Award className="w-6 h-6 text-yellow-600 mr-3" />
            {t('reputation.title')}
          </h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">{t('reputation.howItWorks.title')}</h3>
              <p className="text-yellow-800">
                {t('reputation.howItWorks.description')}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('reputation.earning.title')}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-green-800">{t('reputation.earning.creatingPosts')}</span>
                    <span className="text-green-600 font-semibold">{t('reputation.earning.creatingPostsXP')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-green-800">{t('reputation.earning.uploadingImages')}</span>
                    <span className="text-green-600 font-semibold">{t('reputation.earning.uploadingImagesXP')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-green-800">{t('reputation.earning.writingComments')}</span>
                    <span className="text-green-600 font-semibold">{t('reputation.earning.writingCommentsXP')}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-800">{t('reputation.earning.receivingLikes')}</span>
                    <span className="text-blue-600 font-semibold">{t('reputation.earning.receivingLikesXP')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-800">{t('reputation.earning.dailyLogin')}</span>
                    <span className="text-blue-600 font-semibold">{t('reputation.earning.dailyLoginXP')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-800">{t('reputation.earning.ratingGames')}</span>
                    <span className="text-blue-600 font-semibold">{t('reputation.earning.ratingGamesXP')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('reputation.benefits.title')}</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">{t('reputation.benefits.higherVisibility.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('reputation.benefits.higherVisibility.description')}
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">{t('reputation.benefits.specialBadges.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('reputation.benefits.specialBadges.description')}
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">{t('reputation.benefits.communityTrust.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('reputation.benefits.communityTrust.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Moderation System */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 text-gray-600 mr-3" />
            {t('moderation.title')}
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('moderation.howWeKeepSafe.title')}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">{t('moderation.howWeKeepSafe.automatic.title')}</h4>
                  <p className="text-blue-700 text-sm">
                    {t('moderation.howWeKeepSafe.automatic.description')}
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">{t('moderation.howWeKeepSafe.communityReports.title')}</h4>
                  <p className="text-green-700 text-sm">
                    {t('moderation.howWeKeepSafe.communityReports.description')}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('moderation.enforcement.title')}</h3>
              <div className="space-y-4">
                <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium mr-4 mt-1">
                    {t('moderation.enforcement.firstWarning.label')}
                  </span>
                  <div>
                    <h4 className="font-medium text-yellow-900">{t('moderation.enforcement.firstWarning.title')}</h4>
                    <p className="text-yellow-700 text-sm">
                      {t('moderation.enforcement.firstWarning.description')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium mr-4 mt-1">
                    {t('moderation.enforcement.secondWarning.label')}
                  </span>
                  <div>
                    <h4 className="font-medium text-orange-900">{t('moderation.enforcement.secondWarning.title')}</h4>
                    <p className="text-orange-700 text-sm">
                      {t('moderation.enforcement.secondWarning.description')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium mr-4 mt-1">
                    {t('moderation.enforcement.thirdWarning.label')}
                  </span>
                  <div>
                    <h4 className="font-medium text-red-900">{t('moderation.enforcement.thirdWarning.title')}</h4>
                    <p className="text-red-700 text-sm">
                      {t('moderation.enforcement.thirdWarning.description')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-gray-900 text-white border border-gray-700 rounded-lg">
                  <Ban className="w-5 h-5 mr-4 mt-1 text-red-400" />
                  <div>
                    <h4 className="font-medium">{t('moderation.enforcement.permanentBan.title')}</h4>
                    <p className="text-gray-300 text-sm">
                      {t('moderation.enforcement.permanentBan.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">{t('moderation.appeals.title')}</h3>
              <p className="text-blue-700 text-sm">
                {t('moderation.appeals.description')}
              </p>
            </div>
          </div>
        </section>

        {/* Reporting System */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('reporting.title')}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('reporting.whenToReport.title')}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <ul className="space-y-2 text-gray-600">
                  <li>• {t('reporting.whenToReport.point1')}</li>
                  <li>• {t('reporting.whenToReport.point2')}</li>
                  <li>• {t('reporting.whenToReport.point3')}</li>
                  <li>• {t('reporting.whenToReport.point4')}</li>
                </ul>
                <ul className="space-y-2 text-gray-600">
                  <li>• {t('reporting.whenToReport.point5')}</li>
                  <li>• {t('reporting.whenToReport.point6')}</li>
                  <li>• {t('reporting.whenToReport.point7')}</li>
                  <li>• {t('reporting.whenToReport.point8')}</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('reporting.howToReport.title')}</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">{t('reporting.howToReport.step1.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('reporting.howToReport.step1.description')}
                  </p>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">{t('reporting.howToReport.step2.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('reporting.howToReport.step2.description')}
                  </p>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">{t('reporting.howToReport.step3.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('reporting.howToReport.step3.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact and Support */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('contact.title')}</h2>
          
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">{t('contact.communitySupport.title')}</h3>
                <p className="text-green-700 text-sm mb-3">
                  {t('contact.communitySupport.description')}
                </p>
                <p className="text-green-600 font-medium">
                  <a href="mailto:support@kingdice.gg" className="hover:underline">{t('contact.communitySupport.email')}</a>
                </p>
              </div>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-2">{t('contact.reportSerious.title')}</h3>
                <p className="text-red-700 text-sm mb-3">
                  {t('contact.reportSerious.description')}
                </p>
                <p className="text-red-600 font-medium">
                  <a href="mailto:support@kingdice.gg" className="hover:underline">{t('contact.reportSerious.email')}</a>
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">{t('contact.responseTimes.title')}</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">{t('contact.responseTimes.contentReports')}</span>
                  <p className="text-blue-700">{t('contact.responseTimes.contentReportsTime')}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">{t('contact.responseTimes.supportRequests')}</span>
                  <p className="text-blue-700">{t('contact.responseTimes.supportRequestsTime')}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">{t('contact.responseTimes.appeals')}</span>
                  <p className="text-blue-700">{t('contact.responseTimes.appealsTime')}</p>
                </div>
              </div>
            </div>

            <div className="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200 rounded-lg">
              <Heart className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">{t('contact.thankYou.title')}</h3>
              <p className="text-gray-700">
                {t('contact.thankYou.description')}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* <BackToTopButton /> */}
      <Footer />
    </div>
  );
}

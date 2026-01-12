'use client';

import React from 'react';
import { FileText, Users, Shield, AlertTriangle, Gavel, Clock } from 'lucide-react';
// import BackToTopButton from '@/components/BackToTopButton'; // Removed - using global one from layout
import Footer from '@/components/Footer';
import { useTranslations, useLocale } from 'next-intl';

export default function TermsOfServicePage() {
  const t = useTranslations('termsOfService');
  const locale = useLocale();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-purple-200" />
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Agreement Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-yellow-900 mb-3">{t('agreementNotice.title')}</h2>
              <p className="text-yellow-800">
                {t('agreementNotice.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Acceptance of Terms */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('acceptance.title')}</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('acceptance.description')}
            </p>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">{t('acceptance.confirmation')}</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• {t('acceptance.point1')}</li>
                <li>• {t('acceptance.point2')}</li>
                <li>• {t('acceptance.point3')}</li>
                <li>• {t('acceptance.point4')}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Description of Service */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="w-6 h-6 text-gray-600 mr-3" />
            {t('service.title')}
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('service.whatWeProvide.title')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="text-gray-600 space-y-2">
                  <li>• {t('service.whatWeProvide.point1')}</li>
                  <li>• {t('service.whatWeProvide.point2')}</li>
                  <li>• {t('service.whatWeProvide.point3')}</li>
                  <li>• {t('service.whatWeProvide.point4')}</li>
                </ul>
                <ul className="text-gray-600 space-y-2">
                  <li>• {t('service.whatWeProvide.point5')}</li>
                  <li>• {t('service.whatWeProvide.point6')}</li>
                  <li>• {t('service.whatWeProvide.point7')}</li>
                  <li>• {t('service.whatWeProvide.point8')}</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">{t('service.availability.title')}</h3>
              <p className="text-gray-600">
                {t('service.availability.description')}
              </p>
            </div>
          </div>
        </section>

        {/* User Accounts */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('userAccounts.title')}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('userAccounts.requirements.title')}</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• {t('userAccounts.requirements.point1')}</li>
                <li>• {t('userAccounts.requirements.point2')}</li>
                <li>• {t('userAccounts.requirements.point3')}</li>
                <li>• {t('userAccounts.requirements.point4')}</li>
                <li>• {t('userAccounts.requirements.point5')}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('userAccounts.responsibilities.title')}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">{t('userAccounts.responsibilities.youAreResponsible')}</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• {t('userAccounts.responsibilities.responsiblePoint1')}</li>
                    <li>• {t('userAccounts.responsibilities.responsiblePoint2')}</li>
                    <li>• {t('userAccounts.responsibilities.responsiblePoint3')}</li>
                    <li>• {t('userAccounts.responsibilities.responsiblePoint4')}</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">{t('userAccounts.responsibilities.restrictions')}</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• {t('userAccounts.responsibilities.restrictionPoint1')}</li>
                    <li>• {t('userAccounts.responsibilities.restrictionPoint2')}</li>
                    <li>• {t('userAccounts.responsibilities.restrictionPoint3')}</li>
                    <li>• {t('userAccounts.responsibilities.restrictionPoint4')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Acceptable Use */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 text-gray-600 mr-3" />
            {t('acceptableUse.title')}
          </h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-3">{t('acceptableUse.encouraged.title')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="text-green-700 space-y-1">
                  <li>• {t('acceptableUse.encouraged.point1')}</li>
                  <li>• {t('acceptableUse.encouraged.point2')}</li>
                  <li>• {t('acceptableUse.encouraged.point3')}</li>
                  <li>• {t('acceptableUse.encouraged.point4')}</li>
                </ul>
                <ul className="text-green-700 space-y-1">
                  <li>• {t('acceptableUse.encouraged.point5')}</li>
                  <li>• {t('acceptableUse.encouraged.point6')}</li>
                  <li>• {t('acceptableUse.encouraged.point7')}</li>
                  <li>• {t('acceptableUse.encouraged.point8')}</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-3">{t('acceptableUse.prohibited.title')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="text-red-700 space-y-1">
                  <li>• {t('acceptableUse.prohibited.point1')}</li>
                  <li>• {t('acceptableUse.prohibited.point2')}</li>
                  <li>• {t('acceptableUse.prohibited.point3')}</li>
                  <li>• {t('acceptableUse.prohibited.point4')}</li>
                  <li>• {t('acceptableUse.prohibited.point5')}</li>
                </ul>
                <ul className="text-red-700 space-y-1">
                  <li>• {t('acceptableUse.prohibited.point6')}</li>
                  <li>• {t('acceptableUse.prohibited.point7')}</li>
                  <li>• {t('acceptableUse.prohibited.point8')}</li>
                  <li>• {t('acceptableUse.prohibited.point9')}</li>
                  <li>• {t('acceptableUse.prohibited.point10')}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Content and Intellectual Property */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('content.title')}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('content.yourContent.title')}</h3>
              <div className="space-y-4">
                <p className="text-gray-600">
                  {t('content.yourContent.description')}
                </p>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">{t('content.yourContent.licenseTitle')}</h4>
                  <p className="text-blue-700 text-sm">
                    {t('content.yourContent.licenseDescription')}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('content.kingDiceContent.title')}</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• {t('content.kingDiceContent.point1')}</li>
                <li>• {t('content.kingDiceContent.point2')}</li>
                <li>• {t('content.kingDiceContent.point3')}</li>
                <li>• {t('content.kingDiceContent.point4')}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('content.copyright.title')}</h3>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  {t('content.copyright.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy and Data */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('privacy.title')}</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('privacy.description')}{' '}
              <a href="/privacy-policy" className="text-blue-600 hover:text-blue-800 underline ml-1">{t('privacy.privacyPolicyLink')}</a>,{' '}
              {t('privacy.incorporated')}
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">{t('privacy.dataCollection.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('privacy.dataCollection.description')}
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">{t('privacy.dataSecurity.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('privacy.dataSecurity.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Community Guidelines */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('communityGuidelines.title')}</h2>
          
          <div className="space-y-6">
            <p className="text-gray-600">
              {t('communityGuidelines.description')}{' '}
              <a href="/community-rules" className="text-blue-600 hover:text-blue-800 underline ml-1">{t('communityGuidelines.communityRulesLink')}</a>{' '}
              {t('communityGuidelines.mustFollow')}
            </p>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('communityGuidelines.moderation.title')}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">{t('communityGuidelines.moderation.contentReview.title')}</h4>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• {t('communityGuidelines.moderation.contentReview.point1')}</li>
                    <li>• {t('communityGuidelines.moderation.contentReview.point2')}</li>
                    <li>• {t('communityGuidelines.moderation.contentReview.point3')}</li>
                    <li>• {t('communityGuidelines.moderation.contentReview.point4')}</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">{t('communityGuidelines.moderation.enforcement.title')}</h4>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• {t('communityGuidelines.moderation.enforcement.point1')}</li>
                    <li>• {t('communityGuidelines.moderation.enforcement.point2')}</li>
                    <li>• {t('communityGuidelines.moderation.enforcement.point3')}</li>
                    <li>• {t('communityGuidelines.moderation.enforcement.point4')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Disclaimers and Limitations */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Gavel className="w-6 h-6 text-gray-600 mr-3" />
            {t('disclaimers.title')}
          </h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">{t('disclaimers.serviceAsIs.title')}</h3>
              <p className="text-yellow-800 text-sm">
                {t('disclaimers.serviceAsIs.description')}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('disclaimers.limitation.title')}</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• {t('disclaimers.limitation.point1')}</li>
                <li>• {t('disclaimers.limitation.point2')}</li>
                <li>• {t('disclaimers.limitation.point3')}</li>
                <li>• {t('disclaimers.limitation.point4')}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('disclaimers.thirdParty.title')}</h3>
              <p className="text-gray-600">
                {t('disclaimers.thirdParty.description')}
              </p>
            </div>
          </div>
        </section>

        {/* Termination */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('termination.title')}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('termination.yourRight.title')}</h3>
              <p className="text-gray-600 mb-3">
                {t('termination.yourRight.description')}
              </p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• {t('termination.yourRight.point1')}</li>
                <li>• {t('termination.yourRight.point2')}</li>
                <li>• {t('termination.yourRight.point3')}</li>
                <li>• {t('termination.yourRight.point4')}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('termination.ourRight.title')}</h3>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">
                  {t('termination.ourRight.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Changes to Terms */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Clock className="w-6 h-6 text-gray-600 mr-3" />
            {t('changes.title')}
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('changes.description')}
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">{t('changes.howWeNotify.title')}</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• {t('changes.howWeNotify.point1')}</li>
                  <li>• {t('changes.howWeNotify.point2')}</li>
                  <li>• {t('changes.howWeNotify.point3')}</li>
                  <li>• {t('changes.howWeNotify.point4')}</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">{t('changes.yourOptions.title')}</h3>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>• {t('changes.yourOptions.point1')}</li>
                  <li>• {t('changes.yourOptions.point2')}</li>
                  <li>• {t('changes.yourOptions.point3')}</li>
                  <li>• {t('changes.yourOptions.point4')}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Legal Information */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('legal.title')}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('legal.disputeResolution.title')}</h3>
              <p className="text-gray-600 mb-3">
                {t('legal.disputeResolution.description')}
              </p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• {t('legal.disputeResolution.point1')}</li>
                <li>• {t('legal.disputeResolution.point2')}</li>
                <li>• {t('legal.disputeResolution.point3')}</li>
                <li>• {t('legal.disputeResolution.point4')}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('legal.severability.title')}</h3>
              <p className="text-gray-600">
                {t('legal.severability.description')}
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('contact.title')}</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('contact.description')}
            </p>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">{t('contact.contactUs')}</h3>
              <p className="text-gray-600 text-sm">
                <a href="mailto:support@kingdice.gg" className="text-blue-600 hover:text-blue-800 underline">
                  {t('contact.email')}
                </a>
              </p>
              <p className="text-gray-500 text-xs mt-2">
                {t('contact.forGeneral')}
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-6">
              <p className="text-blue-800 text-sm">
                <strong>{t('contact.thankYou')}</strong>{' '}
                {t('contact.thankYouDescription')}
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

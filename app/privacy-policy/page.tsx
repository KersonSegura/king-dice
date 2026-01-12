'use client';

import React from 'react';
import { Shield, Eye, Cookie, Download, Mail, AlertCircle } from 'lucide-react';
// import BackToTopButton from '@/components/BackToTopButton'; // Removed - using global one from layout
import Footer from '@/components/Footer';
import { useTranslations, useLocale } from 'next-intl';

export default function PrivacyPolicyPage() {
  const t = useTranslations('privacyPolicy');
  const locale = useLocale();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-blue-200" />
            <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Quick Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <Eye className="w-6 h-6 text-blue-600 mr-3 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-blue-900 mb-3">{t('overview.title')}</h2>
              <ul className="text-blue-800 space-y-2">
                <li>• {t('overview.point1')}</li>
                <li>• {t('overview.point2')}</li>
                <li>• {t('overview.point3')}</li>
                <li>• {t('overview.point4')}</li>
                <li>• {t('overview.point5')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Information We Collect */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Download className="w-6 h-6 text-gray-600 mr-3" />
            {t('informationWeCollect.title')}
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('informationWeCollect.accountInfo.title')}</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• {t('informationWeCollect.accountInfo.point1')}</li>
                <li>• {t('informationWeCollect.accountInfo.point2')}</li>
                <li>• {t('informationWeCollect.accountInfo.point3')}</li>
                <li>• {t('informationWeCollect.accountInfo.point4')}</li>
                <li>• {t('informationWeCollect.accountInfo.point5')}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('informationWeCollect.communityActivity.title')}</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• {t('informationWeCollect.communityActivity.point1')}</li>
                <li>• {t('informationWeCollect.communityActivity.point2')}</li>
                <li>• {t('informationWeCollect.communityActivity.point3')}</li>
                <li>• {t('informationWeCollect.communityActivity.point4')}</li>
                <li>• {t('informationWeCollect.communityActivity.point5')}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('informationWeCollect.usageData.title')}</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• {t('informationWeCollect.usageData.point1')}</li>
                <li>• {t('informationWeCollect.usageData.point2')}</li>
                <li>• {t('informationWeCollect.usageData.point3')}</li>
                <li>• {t('informationWeCollect.usageData.point4')}</li>
                <li>• {t('informationWeCollect.usageData.point5')}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Use Your Information */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('howWeUse.title')}</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">{t('howWeUse.serviceProvision.title')}</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• {t('howWeUse.serviceProvision.point1')}</li>
                  <li>• {t('howWeUse.serviceProvision.point2')}</li>
                  <li>• {t('howWeUse.serviceProvision.point3')}</li>
                  <li>• {t('howWeUse.serviceProvision.point4')}</li>
                </ul>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">{t('howWeUse.communication.title')}</h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• {t('howWeUse.communication.point1')}</li>
                  <li>• {t('howWeUse.communication.point2')}</li>
                  <li>• {t('howWeUse.communication.point3')}</li>
                  <li>• {t('howWeUse.communication.point4')}</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">{t('howWeUse.platformImprovement.title')}</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {t('howWeUse.platformImprovement.point1')}</li>
                  <li>• {t('howWeUse.platformImprovement.point2')}</li>
                  <li>• {t('howWeUse.platformImprovement.point3')}</li>
                  <li>• {t('howWeUse.platformImprovement.point4')}</li>
                </ul>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">{t('howWeUse.securitySafety.title')}</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• {t('howWeUse.securitySafety.point1')}</li>
                  <li>• {t('howWeUse.securitySafety.point2')}</li>
                  <li>• {t('howWeUse.securitySafety.point3')}</li>
                  <li>• {t('howWeUse.securitySafety.point4')}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Cookies and Tracking */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Cookie className="w-6 h-6 text-gray-600 mr-3" />
            {t('cookies.title')}
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('cookies.description')}
            </p>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">{t('cookies.essential.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('cookies.essential.description')}
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">{t('cookies.preference.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('cookies.preference.description')}
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">{t('cookies.analytics.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('cookies.analytics.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* OAuth Providers */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('oauth.title')}</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('oauth.description')}
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">{t('oauth.whatWeReceive.title')}</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {t('oauth.whatWeReceive.point1')}</li>
                  <li>• {t('oauth.whatWeReceive.point2')}</li>
                  <li>• {t('oauth.whatWeReceive.point3')}</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">{t('oauth.whatWeDontAccess.title')}</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• {t('oauth.whatWeDontAccess.point1')}</li>
                  <li>• {t('oauth.whatWeDontAccess.point2')}</li>
                  <li>• {t('oauth.whatWeDontAccess.point3')}</li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>{locale === 'es' ? 'Importante:' : 'Important:'}</strong> {t('oauth.important')}
              </p>
            </div>
          </div>
        </section>

        {/* Data Sharing */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dataSharing.title')}</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">{t('dataSharing.neverSell.title')}</h3>
                  <p className="text-red-700">
                    {t('dataSharing.neverSell.description')}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('dataSharing.limitedSharing.title')}</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• <strong>{locale === 'es' ? 'Proveedores de Servicios:' : 'Service Providers:'}</strong> {t('dataSharing.limitedSharing.point1')}</li>
                <li>• <strong>{locale === 'es' ? 'Proveedores OAuth:' : 'OAuth Providers:'}</strong> {t('dataSharing.limitedSharing.point2')}</li>
                <li>• <strong>{locale === 'es' ? 'Requisitos Legales:' : 'Legal Requirements:'}</strong> {t('dataSharing.limitedSharing.point3')}</li>
                <li>• <strong>{locale === 'es' ? 'Transferencias Comerciales:' : 'Business Transfers:'}</strong> {t('dataSharing.limitedSharing.point4')}</li>
                <li>• <strong>{locale === 'es' ? 'Contenido Público:' : 'Public Content:'}</strong> {t('dataSharing.limitedSharing.point5')}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Your Rights */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('yourRights.title')}</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('yourRights.dataControl.title')}</h3>
              <ul className="text-gray-600 space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>{locale === 'es' ? 'Acceso:' : 'Access:'}</strong> {t('yourRights.dataControl.access').replace('Access: ', '')}
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>{locale === 'es' ? 'Corrección:' : 'Correction:'}</strong> {t('yourRights.dataControl.correction').replace('Correction: ', '')}
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>{locale === 'es' ? 'Eliminación:' : 'Deletion:'}</strong> {t('yourRights.dataControl.deletion').replace('Deletion: ', '')}
                    <a href="/data-deletion" className="text-blue-600 hover:text-blue-800 underline ml-1">
                      {t('yourRights.dataControl.learnHow')}
                    </a>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>{locale === 'es' ? 'Portabilidad:' : 'Portability:'}</strong> {t('yourRights.dataControl.portability').replace('Portability: ', '')}
                  </div>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('yourRights.privacyControls.title')}</h3>
              <ul className="text-gray-600 space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>{locale === 'es' ? 'Privacidad del Perfil:' : 'Profile Privacy:'}</strong> {t('yourRights.privacyControls.profilePrivacy').replace('Profile Privacy: ', '')}
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>{locale === 'es' ? 'Comunicación:' : 'Communication:'}</strong> {t('yourRights.privacyControls.communication').replace('Communication: ', '')}
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>{locale === 'es' ? 'Visibilidad del Contenido:' : 'Content Visibility:'}</strong> {t('yourRights.privacyControls.contentVisibility').replace('Content Visibility: ', '')}
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>{locale === 'es' ? 'Procesamiento de Datos:' : 'Data Processing:'}</strong> {t('yourRights.privacyControls.dataProcessing').replace('Data Processing: ', '')}
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Security */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dataSecurity.title')}</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('dataSecurity.description')}
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <ul className="text-gray-600 space-y-2">
                <li>• {t('dataSecurity.point1')}</li>
                <li>• {t('dataSecurity.point2')}</li>
                <li>• {t('dataSecurity.point3')}</li>
                <li>• {t('dataSecurity.point4')}</li>
              </ul>
              <ul className="text-gray-600 space-y-2">
                <li>• {t('dataSecurity.point5')}</li>
                <li>• {t('dataSecurity.point6')}</li>
                <li>• {t('dataSecurity.point7')}</li>
                <li>• {t('dataSecurity.point8')}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* International Users */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('internationalUsers.title')}</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('internationalUsers.description')}
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">{t('internationalUsers.gdpr.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('internationalUsers.gdpr.description')}
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">{t('internationalUsers.ccpa.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('internationalUsers.ccpa.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Children's Privacy */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('childrensPrivacy.title')}</h2>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-gray-700">
              {t('childrensPrivacy.description')}
            </p>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Mail className="w-6 h-6 text-gray-600 mr-3" />
            {t('contact.title')}
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('contact.description')}
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">{t('contact.email')}</h3>
                <p className="text-gray-600">
                  <a href="mailto:support@kingdice.gg" className="text-blue-600 hover:text-blue-800 underline">
                    support@kingdice.gg
                  </a>
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">{t('contact.responseTime')}</h3>
                <p className="text-gray-600">{t('contact.responseTimeValue')}</p>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                <strong>{locale === 'es' ? 'Eliminación de Cuenta:' : 'Account Deletion:'}</strong> {t('contact.accountDeletion')}{' '}
                <a href="/data-deletion" className="text-blue-600 hover:text-blue-800 underline font-semibold">{t('contact.dataDeletionPage')}</a>{' '}
                {t('contact.orEmail')} <a href="mailto:support@kingdice.gg" className="text-blue-600 hover:text-blue-800 underline">support@kingdice.gg</a>.
              </p>
            </div>
          </div>
        </section>

        {/* Policy Updates */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('policyUpdates.title')}</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('policyUpdates.description')}
            </p>
            
            <ul className="text-gray-600 space-y-2 ml-4">
              <li>• {t('policyUpdates.point1')}</li>
              <li>• {t('policyUpdates.point2')}</li>
              <li>• {t('policyUpdates.point3')}</li>
              <li>• {t('policyUpdates.point4')}</li>
            </ul>
            
            <p className="text-gray-600">
              {t('policyUpdates.continuedUse')}
            </p>
          </div>
        </section>
      </div>

      {/* <BackToTopButton /> */}
      <Footer />
    </div>
  );
}

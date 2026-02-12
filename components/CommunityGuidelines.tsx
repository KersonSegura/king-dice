'use client';

import { useEffect } from 'react';
import { Shield, Users, Heart, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';

interface CommunityGuidelinesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommunityGuidelines({ isOpen, onClose }: CommunityGuidelinesProps) {
  const t = useTranslations('gallery');

  // Prevent background scroll when modal is open (also avoids header overlap issues on mobile)
  // ImageModal already does this; keep guidelines consistent. Must run unconditionally (hooks rules).
  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-stretch sm:items-center justify-center z-[250] p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full h-full rounded-none sm:rounded-lg sm:max-w-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain touch-pan-y p-6 sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-primary-500 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              {t('communityGuidelines')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">{t('guidelinesClose')}</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Heart className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {t('guidelinesWelcome')}
                </h3>
                <p className="text-blue-700">
                  {t('guidelinesWelcomeDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* What's Allowed */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              {t('guidelinesAllowedContent')}
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>{t('guidelinesAllowed1')}</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>{t('guidelinesAllowed2')}</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>{t('guidelinesAllowed3')}</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>{t('guidelinesAllowed4')}</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>{t('guidelinesAllowed5')}</span>
              </li>
            </ul>
          </div>

          {/* What's Not Allowed */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              {t('guidelinesProhibitedContent')}
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>{t('guidelinesProhibited1')}</span>
              </li>
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>{t('guidelinesProhibited2')}</span>
              </li>
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>{t('guidelinesProhibited3')}</span>
              </li>
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>{t('guidelinesProhibited4')}</span>
              </li>
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>{t('guidelinesProhibited5')}</span>
              </li>
            </ul>
          </div>

          {/* Moderation System */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Shield className="w-5 h-5 text-gray-600 mr-2" />
              {t('guidelinesModerationSystem')}
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                {t('guidelinesAutoModeration')}
              </p>
              <p>
                {t('guidelinesUserReports')}
              </p>
              <p>
                {t('guidelinesReputationSystem')}
              </p>
            </div>
          </div>

          {/* Consequences */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('guidelinesConsequences')}
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium mr-3">
                  {t('guidelinesFirstWarningLabel')}
                </span>
                <span>{t('guidelinesFirstWarning')}</span>
              </div>
              <div className="flex items-start">
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium mr-3">
                  {t('guidelinesSecondWarningLabel')}
                </span>
                <span>{t('guidelinesSecondWarning')}</span>
              </div>
              <div className="flex items-start">
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium mr-3">
                  {t('guidelinesThirdWarningLabel')}
                </span>
                <span>{t('guidelinesThirdWarning')}</span>
              </div>
              <div className="flex items-start">
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium mr-3">
                  {t('guidelinesSeriousViolationLabel')}
                </span>
                <span>{t('guidelinesSeriousViolation')}</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              {t('guidelinesNeedHelp')}
            </h3>
            <p className="text-green-700 text-sm">
              {t('guidelinesNeedHelpDescription')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            {t('guidelinesUnderstood')}
          </button>
        </div>
      </div>
    </div>
  );
} 
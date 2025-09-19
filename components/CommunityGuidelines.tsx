'use client';

import { useState } from 'react';
import { Shield, Users, Heart, AlertTriangle, CheckCircle } from 'lucide-react';

interface CommunityGuidelinesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommunityGuidelines({ isOpen, onClose }: CommunityGuidelinesProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-primary-500 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              Community Guidelines
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
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
                  Welcome to King Dice!
                </h3>
                <p className="text-blue-700">
                  Our community is dedicated to sharing the passion for board games. 
                  Help us maintain a respectful and welcoming environment for everyone.
                </p>
              </div>
            </div>
          </div>

          {/* What's Allowed */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              Allowed Content
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>Discussions about board games and strategies</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>Photos of game collections and setups</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>Game reviews and recommendations</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>Questions about rules and mechanics</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <span>Board game events and meetups</span>
              </li>
            </ul>
          </div>

          {/* What's Not Allowed */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              Prohibited Content
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>Sexual, violent, or inappropriate content</span>
              </li>
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>Spam, unauthorized advertising, or commercial content</span>
              </li>
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>Hate speech, discrimination, or harassment</span>
              </li>
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>Personal information of other users</span>
              </li>
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                <span>Content that promotes illegal activities</span>
              </li>
            </ul>
          </div>

          {/* Moderation System */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Shield className="w-5 h-5 text-gray-600 mr-2" />
              Moderation System
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>Automatic Moderation:</strong> All content is automatically reviewed 
                before being published to detect inappropriate content.
              </p>
              <p>
                <strong>User Reports:</strong> You can report content that you consider 
                inappropriate. Our team will review each report.
              </p>
              <p>
                <strong>Reputation System:</strong> Users with good reputation have 
                more privileges in the community.
              </p>
            </div>
          </div>

          {/* Consequences */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Consequences for Violations
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium mr-3">
                  1st Warning
                </span>
                <span>Warning and content removed</span>
              </div>
              <div className="flex items-start">
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium mr-3">
                  2nd Warning
                </span>
                <span>Temporary suspension of 24 hours</span>
              </div>
              <div className="flex items-start">
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium mr-3">
                  3rd Warning
                </span>
                <span>Temporary suspension of 7 days</span>
              </div>
              <div className="flex items-start">
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium mr-3">
                  Serious Violation
                </span>
                <span>Permanent account ban</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Need Help?
            </h3>
            <p className="text-green-700 text-sm">
              If you have questions about the guidelines or want to report an issue, 
              contact our moderation team through the report button on any content.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
} 
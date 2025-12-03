'use client';

import React from 'react';
import { Trash2, Mail, Shield, AlertCircle } from 'lucide-react';
import Footer from '@/components/Footer';

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Trash2 className="w-16 h-16 mx-auto mb-4 text-red-200" />
            <h1 className="text-4xl font-bold mb-4">Data Deletion Instructions</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              Learn how to request deletion of your account and personal data from King Dice.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-start space-x-4 mb-6">
            <Shield className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Right to Data Deletion</h2>
              <p className="text-gray-600">
                Under data protection regulations, you have the right to request deletion of your personal data. 
                We are committed to honoring these requests in a timely manner.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* How to Request Deletion */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                How to Request Account Deletion
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>
                    <strong>Log in to your account</strong> on King Dice
                  </li>
                  <li>
                    <strong>Go to Settings</strong> (click on your profile picture → Settings)
                  </li>
                  <li>
                    <strong>Scroll to the "Account" section</strong>
                  </li>
                  <li>
                    <strong>Click "Delete Account"</strong> button
                  </li>
                  <li>
                    <strong>Confirm the deletion</strong> by entering your password
                  </li>
                  <li>
                    <strong>Your account and data will be permanently deleted</strong> within 30 days
                  </li>
                </ol>
              </div>
            </section>

            {/* Alternative Method */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                Alternative: Email Request
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <p className="text-gray-700 mb-3">
                  If you cannot access your account, you can request deletion by email:
                </p>
                <div className="bg-white rounded p-4 border border-orange-300">
                  <p className="font-semibold text-gray-800 mb-2">Send an email to:</p>
                  <a 
                    href="mailto:privacy@kingdice.gg" 
                    className="text-blue-600 hover:text-blue-800 underline text-lg"
                  >
                    privacy@kingdice.gg
                  </a>
                  <p className="text-sm text-gray-600 mt-3">
                    Include the following information in your email:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                    <li>Your username or email address associated with the account</li>
                    <li>Subject line: "Account Deletion Request"</li>
                    <li>Confirmation that you want to permanently delete your account</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* What Gets Deleted */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">What Data Will Be Deleted</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-700 mb-4">
                  When you request account deletion, the following data will be permanently removed:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Your user account and profile information</li>
                  <li>All posts, comments, and forum contributions</li>
                  <li>Gallery images and uploads</li>
                  <li>Game collection and favorites</li>
                  <li>Messages and private communications</li>
                  <li>XP, level, and reputation data</li>
                  <li>All personal preferences and settings</li>
                </ul>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Some data may be retained for legal or security purposes 
                    (e.g., transaction records) as required by law. This data will be anonymized 
                    and cannot be linked back to your account.
                  </p>
                </div>
              </div>
            </section>

            {/* Processing Time */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Processing Time</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <p className="text-gray-700">
                  Account deletion requests are typically processed within <strong>30 days</strong> of receipt. 
                  You will receive a confirmation email once your account has been permanently deleted.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Questions or Concerns?</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-gray-700 mb-3">
                  If you have any questions about data deletion or need assistance with your request, 
                  please contact us:
                </p>
                <div className="space-y-2 text-gray-700">
                  <p>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:privacy@kingdice.gg" className="text-blue-600 hover:text-blue-800 underline">
                      privacy@kingdice.gg
                    </a>
                  </p>
                  <p>
                    <strong>Response Time:</strong> We aim to respond to all inquiries within 48 hours.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}


'use client';

import React from 'react';
import { Shield, Eye, Cookie, Download, Mail, AlertCircle } from 'lucide-react';
import BackToTopButton from '@/components/BackToTopButton';
import Footer from '@/components/Footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-blue-200" />
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Your privacy is important to us. Learn how we collect, use, and protect your data on King Dice.
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
              <h2 className="text-xl font-semibold text-blue-900 mb-3">Privacy at a Glance</h2>
              <ul className="text-blue-800 space-y-2">
                <li>• We collect minimal data necessary to provide our board game services</li>
                <li>• Your personal information is never sold to third parties</li>
                <li>• You have full control over your data and can delete your account anytime</li>
                <li>• We use cookies to improve your experience and remember your preferences</li>
                <li>• All data is stored securely and protected with industry-standard encryption</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Information We Collect */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Download className="w-6 h-6 text-gray-600 mr-3" />
            Information We Collect
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Account Information</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• Username and email address (required for account creation)</li>
                <li>• Profile information you choose to share (bio, favorite games, avatar)</li>
                <li>• Game collection photos and favorite cards (if uploaded)</li>
                <li>• Privacy settings and profile customization preferences</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Community Activity</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• Posts, comments, and forum discussions you create</li>
                <li>• Images uploaded to the community gallery</li>
                <li>• Game ratings and reviews you submit</li>
                <li>• Votes and interactions with other users' content</li>
                <li>• Chat messages and direct communications</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Usage Data</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• Pages visited and features used on King Dice</li>
                <li>• Search queries for games and rules</li>
                <li>• Device information (browser type, operating system)</li>
                <li>• IP address and general location (for security purposes)</li>
                <li>• Login times and session duration</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Use Your Information */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Use Your Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Service Provision</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Maintain your user account and profile</li>
                  <li>• Provide access to game rules and databases</li>
                  <li>• Enable community features and interactions</li>
                  <li>• Process your uploads and content submissions</li>
                </ul>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Communication</h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Send important account notifications</li>
                  <li>• Respond to your support requests</li>
                  <li>• Share platform updates and new features</li>
                  <li>• Moderate community content and interactions</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Platform Improvement</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Analyze usage patterns to improve features</li>
                  <li>• Personalize your King Dice experience</li>
                  <li>• Develop new tools and game resources</li>
                  <li>• Optimize platform performance and reliability</li>
                </ul>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">Security & Safety</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Protect against fraud and abuse</li>
                  <li>• Enforce community guidelines and terms</li>
                  <li>• Investigate violations and disputes</li>
                  <li>• Maintain platform security and integrity</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Cookies and Tracking */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Cookie className="w-6 h-6 text-gray-600 mr-3" />
            Cookies and Tracking
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              King Dice uses cookies and similar technologies to enhance your browsing experience and provide personalized features.
            </p>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Essential Cookies</h3>
                <p className="text-sm text-gray-600">
                  Required for basic site functionality, user authentication, and security features.
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Preference Cookies</h3>
                <p className="text-sm text-gray-600">
                  Remember your settings, theme preferences, and customization choices.
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Analytics Cookies</h3>
                <p className="text-sm text-gray-600">
                  Help us understand how you use King Dice to improve our platform and features.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sharing */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Sharing and Third Parties</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">We Never Sell Your Data</h3>
                  <p className="text-red-700">
                    King Dice does not sell, rent, or trade your personal information to third parties for marketing purposes.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Limited Sharing Scenarios</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• <strong>Service Providers:</strong> Trusted partners who help operate King Dice (hosting, email delivery, analytics)</li>
                <li>• <strong>Legal Requirements:</strong> When required by law, court order, or to protect rights and safety</li>
                <li>• <strong>Business Transfers:</strong> In the unlikely event of a merger or acquisition, with user notification</li>
                <li>• <strong>Public Content:</strong> Information you choose to make public (posts, comments, gallery images)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Your Rights */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Privacy Rights</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Control</h3>
              <ul className="text-gray-600 space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>Access:</strong> Request a copy of your personal data
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>Correction:</strong> Update incorrect or incomplete information
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>Deletion:</strong> Delete your account and associated data
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>Portability:</strong> Export your data in a readable format
                  </div>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Privacy Controls</h3>
              <ul className="text-gray-600 space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>Profile Privacy:</strong> Control who can see your profile and activity
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>Communication:</strong> Opt out of non-essential emails
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>Content Visibility:</strong> Manage who can see your posts and images
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                  <div>
                    <strong>Data Processing:</strong> Object to certain uses of your information
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Security */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Security</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              We implement comprehensive security measures to protect your personal information:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <ul className="text-gray-600 space-y-2">
                <li>• Encryption of data in transit and at rest</li>
                <li>• Regular security audits and vulnerability assessments</li>
                <li>• Secure authentication and session management</li>
                <li>• Limited access to personal data by authorized personnel only</li>
              </ul>
              <ul className="text-gray-600 space-y-2">
                <li>• Regular backups and disaster recovery procedures</li>
                <li>• Monitoring for suspicious activity and unauthorized access</li>
                <li>• Compliance with industry-standard security frameworks</li>
                <li>• Incident response procedures for potential data breaches</li>
              </ul>
            </div>
          </div>
        </section>

        {/* International Users */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">International Users</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              King Dice welcomes users from around the world. We comply with applicable privacy laws including:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">GDPR (European Union)</h3>
                <p className="text-sm text-gray-600">
                  Enhanced rights for EU residents including consent management, data portability, and the right to be forgotten.
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">CCPA (California)</h3>
                <p className="text-sm text-gray-600">
                  Additional privacy rights for California residents including disclosure of data collection and deletion rights.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Children's Privacy */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Children's Privacy</h2>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-gray-700">
              King Dice is designed for users aged 13 and older. We do not knowingly collect personal information from children under 13. 
              If you believe a child under 13 has provided personal information to us, please contact us immediately so we can remove it.
            </p>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Mail className="w-6 h-6 text-gray-600 mr-3" />
            Contact Us About Privacy
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              If you have questions about this Privacy Policy or want to exercise your privacy rights, please contact us:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Email</h3>
                <p className="text-gray-600">privacy@kingdice.com</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Response Time</h3>
                <p className="text-gray-600">We respond to privacy requests within 30 days</p>
              </div>
            </div>
          </div>
        </section>

        {/* Policy Updates */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Policy Updates</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              We may update this Privacy Policy periodically to reflect changes in our practices or applicable laws. 
              When we make significant changes, we will:
            </p>
            
            <ul className="text-gray-600 space-y-2 ml-4">
              <li>• Notify users via email and platform announcements</li>
              <li>• Update the "Last Updated" date at the top of this policy</li>
              <li>• Provide a summary of key changes</li>
              <li>• Give users time to review changes before they take effect</li>
            </ul>
            
            <p className="text-gray-600">
              Your continued use of King Dice after policy updates constitutes acceptance of the revised terms.
            </p>
          </div>
        </section>
      </div>

      <BackToTopButton />
      <Footer />
    </div>
  );
}

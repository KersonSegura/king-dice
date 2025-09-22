'use client';

import React from 'react';
import { FileText, Users, Shield, AlertTriangle, Gavel, Clock } from 'lucide-react';
// import BackToTopButton from '@/components/BackToTopButton'; // Removed - using global one from layout
import Footer from '@/components/Footer';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-purple-200" />
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              The rules and agreements that govern your use of the King Dice platform and community.
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
              <h2 className="text-xl font-semibold text-yellow-900 mb-3">Important Agreement</h2>
              <p className="text-yellow-800">
                By using King Dice, you agree to these Terms of Service. Please read them carefully. 
                If you don't agree with these terms, please don't use our platform.
              </p>
            </div>
          </div>
        </div>

        {/* Acceptance of Terms */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">1. Acceptance of Terms</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              These Terms of Service ("Terms") govern your use of King Dice ("we," "us," or "our"), 
              including our website, mobile applications, and related services (collectively, the "Service").
            </p>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">By using King Dice, you confirm that you:</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• Are at least 13 years old (or the minimum age in your jurisdiction)</li>
                <li>• Have the legal capacity to enter into these Terms</li>
                <li>• Will comply with these Terms and all applicable laws</li>
                <li>• Understand that your use is subject to our Privacy Policy</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Description of Service */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="w-6 h-6 text-gray-600 mr-3" />
            2. King Dice Service
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">What We Provide</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="text-gray-600 space-y-2">
                  <li>• Comprehensive board game rules database</li>
                  <li>• Community forums and discussion platforms</li>
                  <li>• User profiles and social features</li>
                  <li>• Game rating and review systems</li>
                </ul>
                <ul className="text-gray-600 space-y-2">
                  <li>• Image gallery and content sharing</li>
                  <li>• Chat and messaging features</li>
                  <li>• Game discovery and recommendation tools</li>
                  <li>• Educational resources and tutorials</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Service Availability</h3>
              <p className="text-gray-600">
                We strive to provide continuous service but cannot guarantee 100% uptime. 
                We may temporarily suspend or restrict access for maintenance, updates, or technical issues.
              </p>
            </div>
          </div>
        </section>

        {/* User Accounts */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">3. User Accounts and Registration</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Account Requirements</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• Provide accurate and complete registration information</li>
                <li>• Choose a unique username that doesn't violate others' rights</li>
                <li>• Use a valid email address that you can access</li>
                <li>• Keep your password secure and confidential</li>
                <li>• Notify us immediately of any unauthorized account use</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Account Responsibilities</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">✅ You Are Responsible For:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• All activities under your account</li>
                    <li>• Maintaining account security</li>
                    <li>• Updating your information when needed</li>
                    <li>• Complying with community guidelines</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">❌ Account Restrictions:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• One account per person</li>
                    <li>• No sharing accounts with others</li>
                    <li>• No impersonating other users</li>
                    <li>• No creating accounts to evade bans</li>
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
            4. Acceptable Use Policy
          </h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-3">✅ Encouraged Activities</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="text-green-700 space-y-1">
                  <li>• Share helpful game rules and strategies</li>
                  <li>• Create informative posts and reviews</li>
                  <li>• Upload quality images of games and setups</li>
                  <li>• Engage in respectful discussions</li>
                </ul>
                <ul className="text-green-700 space-y-1">
                  <li>• Help new community members</li>
                  <li>• Report inappropriate content</li>
                  <li>• Provide constructive feedback</li>
                  <li>• Celebrate the board gaming hobby</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-3">❌ Prohibited Activities</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="text-red-700 space-y-1">
                  <li>• Harassment, bullying, or hate speech</li>
                  <li>• Spam, scams, or fraudulent content</li>
                  <li>• Adult content or inappropriate material</li>
                  <li>• Copyright infringement</li>
                  <li>• Doxxing or sharing private information</li>
                </ul>
                <ul className="text-red-700 space-y-1">
                  <li>• Impersonation or false identity</li>
                  <li>• Malware, viruses, or malicious code</li>
                  <li>• Automated scraping or data mining</li>
                  <li>• Circumventing security measures</li>
                  <li>• Commercial advertising without permission</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Content and Intellectual Property */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">5. Content and Intellectual Property</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Content</h3>
              <div className="space-y-4">
                <p className="text-gray-600">
                  You retain ownership of content you create on King Dice (posts, comments, images, reviews). 
                  However, by posting content, you grant us certain rights:
                </p>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">License to Use Your Content</h4>
                  <p className="text-blue-700 text-sm">
                    You grant King Dice a worldwide, royalty-free license to use, display, reproduce, 
                    and distribute your content on our platform. This license ends when you delete your content or account.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">King Dice Content</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• Our platform, design, and features are protected by intellectual property laws</li>
                <li>• Game rules are compiled from public sources and publisher materials</li>
                <li>• You may not copy, modify, or redistribute our platform or content</li>
                <li>• Trademarks and logos belong to their respective owners</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Copyright Compliance</h3>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  We respect intellectual property rights. If you believe your copyrighted work has been 
                  infringed, please contact us with a detailed DMCA notice at legal@kingdice.com.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy and Data */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">6. Privacy and Data Protection</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Your privacy is important to us. Our collection and use of your personal information is governed by our 
              <a href="/privacy-policy" className="text-blue-600 hover:text-blue-800 underline ml-1">Privacy Policy</a>, 
              which is incorporated into these Terms by reference.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Data Collection</h3>
                <p className="text-sm text-gray-600">
                  We collect only the information necessary to provide our services and improve your experience.
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Data Security</h3>
                <p className="text-sm text-gray-600">
                  We implement industry-standard security measures to protect your personal information.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Community Guidelines */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">7. Community Guidelines and Moderation</h2>
          
          <div className="space-y-6">
            <p className="text-gray-600">
              King Dice is a community-driven platform. We maintain detailed 
              <a href="/community-rules" className="text-blue-600 hover:text-blue-800 underline ml-1">Community Rules</a> 
              that all users must follow.
            </p>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Moderation Policy</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Content Review</h4>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Automated systems screen content</li>
                    <li>• Human moderators review reported content</li>
                    <li>• Community members can report violations</li>
                    <li>• Appeals process available for all actions</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Enforcement Actions</h4>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Content removal or editing</li>
                    <li>• Temporary or permanent account suspension</li>
                    <li>• Feature restrictions (posting, messaging)</li>
                    <li>• Community reputation adjustments</li>
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
            8. Disclaimers and Limitations
          </h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">Service "As Is"</h3>
              <p className="text-yellow-800 text-sm">
                King Dice is provided "as is" without warranties of any kind. We don't guarantee that the service 
                will be error-free, secure, or always available.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Limitation of Liability</h3>
              <ul className="text-gray-600 space-y-2 ml-4">
                <li>• We're not liable for indirect, incidental, or consequential damages</li>
                <li>• Our total liability is limited to the amount you've paid us (if any)</li>
                <li>• We're not responsible for user-generated content or third-party actions</li>
                <li>• Some jurisdictions don't allow liability limitations, so these may not apply to you</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Third-Party Content</h3>
              <p className="text-gray-600">
                King Dice may contain links to third-party websites or reference third-party games and materials. 
                We're not responsible for the content, accuracy, or practices of these third parties.
              </p>
            </div>
          </div>
        </section>

        {/* Termination */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">9. Account Termination</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Right to Terminate</h3>
              <p className="text-gray-600 mb-3">
                You may delete your account at any time through your account settings. Upon deletion:
              </p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• Your profile and personal information will be removed</li>
                <li>• Your posts and comments may remain but will be anonymized</li>
                <li>• You'll lose access to all King Dice features</li>
                <li>• Some data may be retained for legal or security purposes</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Our Right to Terminate</h3>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">
                  We may suspend or terminate your account if you violate these Terms, engage in harmful behavior, 
                  or for other legitimate reasons. We'll provide notice when possible, but may act immediately for serious violations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Changes to Terms */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Clock className="w-6 h-6 text-gray-600 mr-3" />
            10. Changes to These Terms
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              We may update these Terms periodically to reflect changes in our service, legal requirements, or business practices.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">How We Notify You</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Email notification to registered users</li>
                  <li>• Platform announcements and banners</li>
                  <li>• Updated "Last Modified" date</li>
                  <li>• Summary of significant changes</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Your Options</h3>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>• Review changes before they take effect</li>
                  <li>• Contact us with questions or concerns</li>
                  <li>• Delete your account if you disagree</li>
                  <li>• Continued use means acceptance</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Legal Information */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">11. Legal and Governing Law</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Dispute Resolution</h3>
              <p className="text-gray-600 mb-3">
                We encourage resolving disputes through direct communication. If that's not possible:
              </p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• Contact our support team for mediation</li>
                <li>• Consider arbitration for faster resolution</li>
                <li>• Legal action should be a last resort</li>
                <li>• Small claims court may be appropriate for minor disputes</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Severability</h3>
              <p className="text-gray-600">
                If any part of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">12. Contact Information</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              If you have questions about these Terms of Service, please contact us:
            </p>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">General Support</h3>
                <p className="text-gray-600 text-sm">support@kingdice.com</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Legal Questions</h3>
                <p className="text-gray-600 text-sm">legal@kingdice.com</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Abuse Reports</h3>
                <p className="text-gray-600 text-sm">abuse@kingdice.com</p>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-6">
              <p className="text-blue-800 text-sm">
                <strong>Thank you for being part of the King Dice community!</strong> 
                These terms help us maintain a safe, fun, and respectful environment for all board game enthusiasts.
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

'use client';

import React from 'react';
import { Shield, Users, Heart, AlertTriangle, CheckCircle, Award, MessageSquare, Camera, Star, Ban } from 'lucide-react';
// import BackToTopButton from '@/components/BackToTopButton'; // Removed - using global one from layout
import Footer from '@/components/Footer';

export default function CommunityRulesPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-green-200" />
            <h1 className="text-4xl font-bold mb-4">Community Rules</h1>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              Guidelines for creating a welcoming, respectful, and fun board gaming community for everyone.
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
              <h2 className="text-xl font-semibold text-blue-900 mb-3">Welcome to King Dice Community!</h2>
              <p className="text-blue-800">
                Our community is dedicated to sharing the passion for board games. We're here to help each other 
                discover new games, learn rules, share strategies, and celebrate this amazing hobby together. 
                Help us maintain a respectful and welcoming environment for everyone!
              </p>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="w-6 h-6 text-gray-600 mr-3" />
            Our Community Values
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                  <Heart className="w-4 h-4 mr-2" />
                  Respect & Kindness
                </h3>
                <p className="text-green-700 text-sm">
                  Treat every community member with respect, regardless of their experience level or game preferences.
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Helpful & Constructive
                </h3>
                <p className="text-blue-700 text-sm">
                  Share knowledge, help newcomers, and provide constructive feedback to build a supportive community.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
                  <Star className="w-4 h-4 mr-2" />
                  Quality & Relevance
                </h3>
                <p className="text-purple-700 text-sm">
                  Share high-quality content that's relevant to board gaming and adds value to discussions.
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Safe & Inclusive
                </h3>
                <p className="text-orange-700 text-sm">
                  Create a safe space where everyone feels welcome, regardless of background, identity, or gaming experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Allowed Content */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            What's Encouraged
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
                Discussion & Learning
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Game strategy discussions and tips</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Rules questions and clarifications</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Game reviews and honest opinions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Recommendations and game suggestions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Educational content and tutorials</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Camera className="w-5 h-5 text-purple-600 mr-2" />
                Visual Content
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Game collection photos and showcases</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Board setups and game in progress shots</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Custom game modifications and accessories</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Game storage and organization solutions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Event photos and meetup documentation</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 text-green-600 mr-2" />
              Community Activities
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Game night organization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Local meetup announcements</span>
                </li>
              </ul>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Tournament and event sharing</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Collaborative game challenges</span>
                </li>
              </ul>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Helping newcomers learn</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Community feedback and ideas</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Prohibited Content */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            What's Not Allowed
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Harmful Content</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Hate speech, discrimination, or harassment</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Sexual, violent, or inappropriate content</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Personal attacks or bullying</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Doxxing or sharing private information</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Content promoting illegal activities</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Spam & Low-Quality</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Spam, repetitive, or low-effort posts</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Unauthorized advertising or self-promotion</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Off-topic content unrelated to board games</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Clickbait titles or misleading content</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Vote manipulation or fake engagement</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Violations</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Multiple accounts per person</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Impersonating other users</span>
                </li>
              </ul>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Sharing accounts with others</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Evading bans or suspensions</span>
                </li>
              </ul>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>False reporting or abuse</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Circumventing platform features</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Reputation System */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Award className="w-6 h-6 text-yellow-600 mr-3" />
            Reputation System
          </h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">How Reputation Works</h3>
              <p className="text-yellow-800">
                King Dice uses a reputation system to recognize valuable community members and maintain quality. 
                Your reputation score reflects your positive contributions to the community.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Earning Reputation Points</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-green-800">Creating helpful posts</span>
                    <span className="text-green-600 font-semibold">+5 XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-green-800">Uploading quality images</span>
                    <span className="text-green-600 font-semibold">+3 XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-green-800">Writing thoughtful comments</span>
                    <span className="text-green-600 font-semibold">+2 XP</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-800">Receiving likes on content</span>
                    <span className="text-blue-600 font-semibold">+1 XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-800">Daily login streak</span>
                    <span className="text-blue-600 font-semibold">+1 XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-800">Rating games</span>
                    <span className="text-blue-600 font-semibold">+1 XP</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Reputation Benefits</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Higher Visibility</h4>
                  <p className="text-sm text-gray-600">
                    Your posts and comments get better visibility in feeds and search results.
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Special Badges</h4>
                  <p className="text-sm text-gray-600">
                    Earn recognition badges that display on your profile and posts.
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Community Trust</h4>
                  <p className="text-sm text-gray-600">
                    Build trust within the community as a reliable and helpful member.
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
            Moderation & Enforcement
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">How We Keep the Community Safe</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Automatic Moderation</h4>
                  <p className="text-blue-700 text-sm">
                    All content is automatically reviewed before publication using AI to detect 
                    inappropriate content, spam, and policy violations.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Community Reports</h4>
                  <p className="text-green-700 text-sm">
                    Users can report content that violates community rules. Our moderation team 
                    reviews every report within 24 hours.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Enforcement Actions</h3>
              <div className="space-y-4">
                <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium mr-4 mt-1">
                    1st Warning
                  </span>
                  <div>
                    <h4 className="font-medium text-yellow-900">Content Removal & Warning</h4>
                    <p className="text-yellow-700 text-sm">
                      Violating content is removed and user receives an educational warning about community rules.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium mr-4 mt-1">
                    2nd Warning
                  </span>
                  <div>
                    <h4 className="font-medium text-orange-900">24-Hour Suspension</h4>
                    <p className="text-orange-700 text-sm">
                      Temporary suspension from posting, commenting, and community interactions for 24 hours.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium mr-4 mt-1">
                    3rd Warning
                  </span>
                  <div>
                    <h4 className="font-medium text-red-900">7-Day Suspension</h4>
                    <p className="text-red-700 text-sm">
                      Extended suspension from all community features for one week, with account review.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 bg-gray-900 text-white border border-gray-700 rounded-lg">
                  <Ban className="w-5 h-5 mr-4 mt-1 text-red-400" />
                  <div>
                    <h4 className="font-medium">Permanent Ban</h4>
                    <p className="text-gray-300 text-sm">
                      For serious violations or repeated offenses, accounts may be permanently banned from King Dice.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Appeals Process</h3>
              <p className="text-blue-700 text-sm">
                If you believe a moderation action was taken in error, you can appeal by contacting our support team. 
                All appeals are reviewed by senior moderators within 48 hours.
              </p>
            </div>
          </div>
        </section>

        {/* Reporting System */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Report Violations</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">When to Report</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <ul className="space-y-2 text-gray-600">
                  <li>• Content that violates community rules</li>
                  <li>• Harassment or inappropriate behavior</li>
                  <li>• Spam or unauthorized advertising</li>
                  <li>• Copyright infringement</li>
                </ul>
                <ul className="space-y-2 text-gray-600">
                  <li>• Impersonation or fake accounts</li>
                  <li>• Adult or violent content</li>
                  <li>• Personal information sharing</li>
                  <li>• Technical abuse or hacking attempts</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">How to Report</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">Find the Report Button</h4>
                  <p className="text-sm text-gray-600">
                    Click the report button on any post, comment, or user profile.
                  </p>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">Select Violation Type</h4>
                  <p className="text-sm text-gray-600">
                    Choose the specific rule violation from the provided options.
                  </p>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">Provide Details</h4>
                  <p className="text-sm text-gray-600">
                    Add any additional context that helps our moderation team understand the issue.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact and Support */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Need Help or Have Questions?</h2>
          
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Community Support</h3>
                <p className="text-green-700 text-sm mb-3">
                  For questions about community rules, moderation decisions, or general support.
                </p>
                <p className="text-green-600 font-medium">support@kingdice.com</p>
              </div>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-2">Report Serious Issues</h3>
                <p className="text-red-700 text-sm mb-3">
                  For urgent safety concerns, harassment, or serious rule violations.
                </p>
                <p className="text-red-600 font-medium">abuse@kingdice.com</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Response Times</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Content Reports:</span>
                  <p className="text-blue-700">Within 24 hours</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Support Requests:</span>
                  <p className="text-blue-700">1-2 business days</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Appeals:</span>
                  <p className="text-blue-700">Within 48 hours</p>
                </div>
              </div>
            </div>

            <div className="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200 rounded-lg">
              <Heart className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Thank You for Being Part of Our Community!</h3>
              <p className="text-gray-700">
                Your participation and adherence to these rules help make King Dice a welcoming place 
                for board game enthusiasts around the world.
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

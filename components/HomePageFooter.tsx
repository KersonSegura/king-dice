'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Mail, MessageCircle, Users, Gamepad2, Star, Shield, Crown, Coffee, Zap } from 'lucide-react';

export default function HomePageFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Love King Dice Section */}
      <section className="bg-gray-900 py-16 border-b border-gray-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Crown className="w-16 h-16 mx-auto mb-4 text-[#fbae17]" />
            <h2 className="text-4xl font-bold text-white mb-4">Love King Dice?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Support our mission to build the ultimate board game community
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <Coffee className="w-12 h-12 mx-auto mb-4 text-[#fbae17]" />
              <h3 className="text-xl font-semibold text-white mb-2">Community Supporter</h3>
              <p className="text-gray-400 text-sm mb-4">
                Help keep King Dice running 24/7<br />and maintaining the platform
              </p>
              <button className="bg-[#fbae17] hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                $5/month
              </button>
            </div>
            
            <div className="text-center">
              <Star className="w-12 h-12 mx-auto mb-4 text-[#fbae17]" />
              <h3 className="text-xl font-semibold text-white mb-2">Dice Collector</h3>
              <p className="text-gray-400 text-sm mb-4">
                Unlock exclusive clothing and accessories for your dice
              </p>
              <button className="bg-[#fbae17] hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                $10/month
              </button>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 text-[#fbae17]">
                <svg 
                  className="w-12 h-12" 
                  fill="none"
                  stroke="currentColor" 
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  {/* Dice outline */}
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  
                  {/* Three dots pattern (like "3" on a real die) */}
                  {/* Top-left dot */}
                  <circle cx="8" cy="8" r="0.7" fill="currentColor" />
                  
                  {/* Center dot */}
                  <circle cx="12" cy="12" r="0.7" fill="currentColor" />
                  
                  {/* Bottom-right dot */}
                  <circle cx="16" cy="16" r="0.7" fill="currentColor" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">King Dice Patron</h3>
              <p className="text-gray-400 text-sm mb-4">
                Previous perks + extra XP + premium badge and frame + credits mention
              </p>
              <button className="bg-[#fbae17] hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                $25/month
              </button>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Secure payment processing • Cancel anytime • 100% goes to King Dice
            </p>
          </div>
        </div>
      </section>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <Image
                src="/DiceLogo.svg"
                alt="King Dice"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <span className="text-xl font-bold">King Dice</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Your ultimate destination for board game rules, community discussions, and gaming tools. 
              Join thousands of players discovering their next favorite game.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://discord.gg/3xh7yUnnnW"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Join our Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
              <a
                href="https://x.com/KingDiceHub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Follow us on X"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/kingdice.gg/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Follow us on Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="mailto:contact@kingdice.com"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Contact us"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Games Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <div className="w-5 h-5 mr-2 text-[#fbae17]">
                <svg 
                  className="w-5 h-5" 
                  fill="none"
                  stroke="currentColor" 
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  {/* Dice outline */}
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  
                  {/* Three dots pattern (like "3" on a real die) */}
                  {/* Top-left dot */}
                  <circle cx="8" cy="8" r="0.7" fill="currentColor" />
                  
                  {/* Center dot */}
                  <circle cx="12" cy="12" r="0.7" fill="currentColor" />
                  
                  {/* Bottom-right dot */}
                  <circle cx="16" cy="16" r="0.7" fill="currentColor" />
                </svg>
              </div>
              Games
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/all-games" className="text-gray-400 hover:text-white transition-colors">
                  All Games
                </Link>
              </li>
              <li>
                <Link href="/hot-games" className="text-gray-400 hover:text-white transition-colors">
                  Hot Games
                </Link>
              </li>
              <li>
                <Link href="/top-ranked" className="text-gray-400 hover:text-white transition-colors">
                  Top Ranked
                </Link>
              </li>
              <li>
                <Link href="/boardgames" className="text-gray-400 hover:text-white transition-colors">
                  Game Database
                </Link>
              </li>
            </ul>
          </div>

          {/* Community Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-[#fbae17]" />
              Community
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/forums" className="text-gray-400 hover:text-white transition-colors">
                  Forums
                </Link>
              </li>
              <li>
                <Link href="/community-gallery" className="text-gray-400 hover:text-white transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/#community-feed" className="text-gray-400 hover:text-white transition-colors">
                  Feed
                </Link>
              </li>
              <li>
                <a
                  href="https://discord.gg/3xh7yUnnnW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Discord Server
                </a>
              </li>
            </ul>
          </div>

          {/* Tools & Features */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-[#fbae17]" />
              Tools & Features
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/my-dice" className="text-gray-400 hover:text-white transition-colors">
                  My Dice
                </Link>
              </li>
              <li>
                <Link href="/pixel-canvas" className="text-gray-400 hover:text-white transition-colors">
                  Pixel Canvas
                </Link>
              </li>
              <li>
                <Link href="/boardle" className="text-gray-400 hover:text-white transition-colors">
                  Boardle Game
                </Link>
              </li>
              <li>
                <Link href="/catan-map-generator" className="text-gray-400 hover:text-white transition-colors">
                  Catan Maps
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-lg font-semibold mb-2">Stay Updated</h3>
            <p className="text-gray-400 text-sm mb-4">
              Get notified about new features and updates
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17] text-white placeholder-gray-400"
              />
              <button className="px-6 py-2 bg-[#fbae17] hover:bg-yellow-600 text-white rounded-r-lg transition-colors font-medium">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-gray-400 text-sm">
                © {currentYear} King Dice. All rights reserved.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms-of-service" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="/community-rules" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Shield className="w-4 h-4 mr-1" style={{ color: '#fbae17' }} />
                  Community Rules
                </Link>
                <Link href="/credits" className="text-gray-400 hover:text-white transition-colors">
                  Credits
                </Link>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <p className="text-gray-400 text-sm flex items-center">
                Made with <Heart className="w-4 h-4 mx-1 text-red-500" /> for board game lovers
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

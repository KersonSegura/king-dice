'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Mail, MessageCircle, Users, Gamepad2, BookOpen, Star, Shield } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-16 w-full">
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
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
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
                  <circle cx="7" cy="7" r="0.7" fill="currentColor" />
                  
                  {/* Center dot */}
                  <circle cx="12" cy="12" r="0.7" fill="currentColor" />
                  
                  {/* Bottom-right dot */}
                  <circle cx="17" cy="17" r="0.7" fill="currentColor" />
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
          <div className="max-w-lg mx-auto text-center px-4">
            <h3 className="text-lg font-semibold mb-2">Stay Updated</h3>
            <p className="text-gray-400 text-sm mb-4">
              Get notified about new features and updates
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17] text-white placeholder-gray-400"
              />
              <button className="px-6 py-2 bg-[#fbae17] hover:bg-yellow-600 text-white rounded-lg sm:rounded-l-none sm:rounded-r-lg transition-colors font-medium whitespace-nowrap">
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

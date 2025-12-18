'use client';

import { useState, useEffect } from 'react';
import { BoardleGame } from '@/components/BoardleGame';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';
// import BackToTopButton from '@/components/BackToTopButton'; // Removed - using global one from layout

export default function BoardlePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="w-full mx-auto px-4 py-8 flex-1">
        <div className="flex items-center justify-center mb-8">
          <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Boardle</h1>
              <p className="text-lg text-gray-600">
                Guess the daily board game in 6 tries!
              </p>
            </div>
          </div>
        </div>
        
        <BoardleGame />
      </div>

      {/* Back to Top Button */}
      {/* <BackToTopButton /> */}

      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

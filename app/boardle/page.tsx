'use client';

import { useState, useEffect } from 'react';
import { BoardleGame } from '@/components/BoardleGame';
import BackButton from '@/components/BackButton';
import Footer from '@/components/Footer';
// import BackToTopButton from '@/components/BackToTopButton'; // Removed - using global one from layout

export default function BoardlePage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-8 flex flex-col">
      <div className="w-full mx-auto px-4">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <BackButton />
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

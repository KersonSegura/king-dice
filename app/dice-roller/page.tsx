'use client';

import DiceRoller from '@/components/dice/DiceRoller';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DiceRollerPage() {
  return (
    <div className="flex flex-col min-h-screen">
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
      <div className="flex-1">
        <DiceRoller />
      </div>
    </div>
  );
}


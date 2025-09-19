'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  className?: string;
  fallbackUrl?: string;
}

export default function BackButton({ className = '', fallbackUrl = '/' }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to home page or specified URL
      router.push(fallbackUrl);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md ${className}`}
      title="Go back"
    >
      <ArrowLeft className="w-5 h-5 text-gray-600" />
    </button>
  );
}

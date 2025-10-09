import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {/* Invisible container for centering */}
      <div className="invisible absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
          <p className="text-gray-600 mb-8 max-w-md">
            Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
          </p>
          <div className="space-x-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/90 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
            <Link
              href="/boardgames"
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Games
            </Link>
          </div>
        </div>
      </div>
      
      {/* Visible content */}
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <div className="space-x-4">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/90 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Link>
          <Link
            href="/boardgames"
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Browse Games
          </Link>
        </div>
      </div>
    </div>
  );
}

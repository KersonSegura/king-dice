'use client';

import * as Sentry from "@sentry/nextjs";

export default function TestSentryPage() {
  const triggerError = () => {
    // This will trigger a test error to verify Sentry is working
    myUndefinedFunction();
  };

  const triggerSentryError = () => {
    // Alternative way to test Sentry
    throw new Error("Sentry Test Error - This is intentional!");
  };

  const triggerSentrySpan = () => {
    // Test performance monitoring
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        span.setAttribute("test", "sentry-working");
        span.setAttribute("platform", "king-dice");
        
        console.log("Sentry span test completed successfully!");
        alert("Sentry span tracking test completed! Check your Sentry dashboard.");
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          🚨 Sentry Test Page
        </h1>
        
        <div className="space-y-4">
          <button
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-semibold"
            onClick={triggerError}
          >
            Test 1: Call Undefined Function
          </button>
          
          <button
            className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
            onClick={triggerSentryError}
          >
            Test 2: Throw Intentional Error
          </button>
          
          <button
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            onClick={triggerSentrySpan}
          >
            Test 3: Performance Tracking
          </button>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              📋 Instructions:
            </p>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Click any button above to test Sentry</li>
              <li>• Check your browser console for Sentry logs</li>
              <li>• Visit your Sentry dashboard to see errors</li>
              <li>• Dashboard: https://sentry.io/organizations/king-dice/projects/javascript-nextjs/</li>
            </ul>
          </div>
          
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              <strong>✅ Sentry is configured with DSN:</strong><br/>
              <code className="text-xs break-all">
                https://af8c3a17c501934a4b8f910fa6fc9922@o4510061874249728.ingest.us.sentry.io/4510061881458688
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

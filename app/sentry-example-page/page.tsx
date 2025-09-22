'use client';

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Sentry Test Page
        </h1>
        
        <div className="space-y-4">
          <button
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            onClick={() => {
              // This will trigger a test error to verify Sentry is working
              throw new Error("Sentry Test Error - This is intentional!");
            }}
          >
            🚨 Test Sentry Error Tracking
          </button>
          
          <button
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => {
              // Test Sentry span tracking
              Sentry.startSpan(
                {
                  op: "ui.click",
                  name: "Test Button Click",
                },
                (span) => {
                  span.setAttribute("test", "sentry-working");
                  span.setAttribute("platform", "king-dice");
                  
                  // Log some info
                  console.log("Sentry span test completed successfully!");
                  
                  alert("Sentry span tracking test completed! Check your Sentry dashboard.");
                }
              );
            }}
          >
            📊 Test Sentry Performance Tracking
          </button>
          
          <button
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            onClick={() => {
              // Test console logging integration
              console.log("This is a test log message");
              console.warn("This is a test warning message");
              console.error("This is a test error message");
              
              alert("Console logging test completed! Check your Sentry dashboard for logs.");
            }}
          >
            📝 Test Console Logging
          </button>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Instructions:</strong>
            </p>
            <ul className="text-xs text-gray-500 mt-2 space-y-1">
              <li>• Click the red button to test error tracking</li>
              <li>• Click the blue button to test performance monitoring</li>
              <li>• Click the green button to test console logging</li>
              <li>• Check your Sentry dashboard to see the results</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

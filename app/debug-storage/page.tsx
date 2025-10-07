'use client';

import { useState, useEffect } from 'react';

export default function DebugStoragePage() {
  const [storageData, setStorageData] = useState<any>({});

  useEffect(() => {
    // Get all storage data
    const data = {
      localStorage: {},
      sessionStorage: {},
      cookies: document.cookie,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Get localStorage data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        (data.localStorage as any)[key] = localStorage.getItem(key);
      }
    }

    // Get sessionStorage data
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        (data.sessionStorage as any)[key] = sessionStorage.getItem(key);
      }
    }

    setStorageData(data);
  }, []);

  const setTestUser = () => {
    localStorage.setItem('currentUser', 'your-username-here'); // Replace with your actual username
    localStorage.setItem('username', 'your-username-here');
    window.location.reload();
  };

  const clearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Storage Debug Page</h1>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-x-4">
              <button
                onClick={setTestUser}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Set Test User
              </button>
              <button
                onClick={clearStorage}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear All Storage
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">localStorage</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(storageData.localStorage, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">sessionStorage</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(storageData.sessionStorage, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Cookies</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {storageData.cookies || 'No cookies found'}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <div className="space-y-2 text-sm">
              <p>1. Click "Set Test User" to add your username to localStorage</p>
              <p>2. Replace "your-username-here" in the code with your actual username</p>
              <p>3. Go back to your profile page</p>
              <p>4. Check the browser console for debug information</p>
              <p>5. The edit buttons should now appear</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

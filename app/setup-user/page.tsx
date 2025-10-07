'use client';

import { useEffect, useState } from 'react';

export default function SetupUserPage() {
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Set up the user data in localStorage
    const setupUser = () => {
      try {
        // Set the current user
        localStorage.setItem('currentUser', 'kingdice');
        localStorage.setItem('username', 'kingdice');
        localStorage.setItem('user', 'kingdice');
        
        // Keep the old user ID for backward compatibility
        const oldUserId = localStorage.getItem('reglas-de-mesa-user-id');
        if (oldUserId) {
          console.log('Keeping old user ID:', oldUserId);
        }
        
        setStatus('✅ User setup complete! Username "kingdice" has been set in localStorage.');
        
        // Redirect to profile after 2 seconds
        setTimeout(() => {
          window.location.href = '/profile/kingdice';
        }, 2000);
        
      } catch (error) {
        setStatus('❌ Error setting up user: ' + error);
      }
    };

    setupUser();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold mb-4">Setting Up User</h1>
          <div className="mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fbae17] mx-auto mb-4"></div>
            <p className="text-gray-600">Setting up localStorage for username "kingdice"...</p>
          </div>
          <div className="text-sm text-gray-500">
            {status}
          </div>
          <div className="mt-4">
            <a 
              href="/profile/kingdice" 
              className="text-[#fbae17] hover:underline"
            >
              Go to your profile
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

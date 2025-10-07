'use client';

import Image from 'next/image';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export default function LoadingScreen({ 
  message = "Loading", 
  subMessage = "Please wait..." 
}: LoadingScreenProps) {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(249, 250, 251, 0.95)',
        zIndex: 99999,
        backdropFilter: 'blur(10px)'
      }}
    >
      <div 
        style={{
          backgroundColor: 'transparent',
          padding: '2rem',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0
        }}
      >
        <div className="text-center">
          <div className="mb-6">
            <Image 
              src="/DiceLogo.svg" 
              alt="King Dice Logo" 
              width={80} 
              height={80}
              className="mx-auto animate-pulse"
            />
          </div>
          <h2 className="text-lg font-medium text-gray-900">{message}</h2>
          <p className="text-sm text-gray-600 mt-2">{subMessage}</p>
        </div>
      </div>
    </div>
  );
}

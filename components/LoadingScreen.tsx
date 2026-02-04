'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

function LoadingScreenInner({ message = "Loading", subMessage = "Please wait..." }: LoadingScreenProps) {
  const searchParams = useSearchParams();
  if (searchParams.get('embed') === '1') return null;
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
          <h2 className="text-lg font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{message}</h2>
          <p className="text-sm text-gray-600 mt-2 whitespace-nowrap overflow-hidden text-ellipsis">{subMessage}</p>
        </div>
      </div>
    </div>
  );
}

export default function LoadingScreen(props: LoadingScreenProps) {
  return (
    <Suspense fallback={null}>
      <LoadingScreenInner {...props} />
    </Suspense>
  );
}

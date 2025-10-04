'use client';

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
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">{message}</h2>
          <p className="text-sm text-gray-600 mt-2">{subMessage}</p>
        </div>
      </div>
    </div>
  );
}

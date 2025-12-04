import { useState, useEffect } from 'react';

/**
 * Custom hook to manage login modal state with persistence across tab/app switches
 * Uses sessionStorage to persist the modal open state
 */
export function useLoginModal() {
  // Initialize from sessionStorage to persist across tab switches
  const [showLoginModal, setShowLoginModal] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('loginModalOpen') === 'true';
    }
    return false;
  });

  // Persist login modal state to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (showLoginModal) {
        sessionStorage.setItem('loginModalOpen', 'true');
      } else {
        sessionStorage.removeItem('loginModalOpen');
      }
    }
  }, [showLoginModal]);

  // Restore login modal state when page regains focus (handles tab/app switching)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const shouldBeOpen = sessionStorage.getItem('loginModalOpen') === 'true';
        if (shouldBeOpen && !showLoginModal) {
          setShowLoginModal(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showLoginModal]);

  return [showLoginModal, setShowLoginModal] as const;
}


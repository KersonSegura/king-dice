'use client';

import { useState } from 'react';
import { BellPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function DevNotificationTestButton() {
  const { user, isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);

  if (process.env.NODE_ENV === 'production' || !isAuthenticated) return null;

  const trigger = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, kind: 'follow' })
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={trigger}
      title="Create test notification"
      className="fixed z-40 bottom-28 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg p-3 flex items-center gap-2"
    >
      <BellPlus className="w-5 h-5" />
      <span className="hidden sm:inline text-sm">Test notif</span>
    </button>
  );
}



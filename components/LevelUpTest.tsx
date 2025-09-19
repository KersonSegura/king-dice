'use client';

import { useLevelUp } from '@/contexts/LevelUpContext';
import { useState } from 'react';

export default function LevelUpTest() {
  const { showLevelUp } = useLevelUp();
  const [testLevel, setTestLevel] = useState(1);

  const triggerLevelUp = () => {
    showLevelUp(testLevel);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-40">
      <h3 className="text-sm font-bold mb-2">Level Up Test</h3>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max="10"
          value={testLevel}
          onChange={(e) => setTestLevel(parseInt(e.target.value) || 1)}
          className="w-16 px-2 py-1 border rounded text-sm"
        />
        <button
          onClick={triggerLevelUp}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
        >
          Test Level {testLevel}
        </button>
      </div>
    </div>
  );
}

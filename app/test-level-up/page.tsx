'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAwardXP } from '@/hooks/useAwardXP';
import { useLevelUpDetection } from '@/hooks/useLevelUpDetection';

export default function TestLevelUpPage() {
  const { user, isAuthenticated } = useAuth();
  const { awardXP } = useAwardXP();
  const { checkForLevelUp, initializeLevel, lastKnownLevel, lastShownLevel } = useLevelUpDetection();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to test level up notifications</h1>
        </div>
      </div>
    );
  }

  const handleAwardXP = async (action: string) => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await awardXP(user.id, user.username, action);
      if (result) {
        setMessage(`XP awarded successfully! Leveled up: ${result.leveledUp ? 'Yes' : 'No'}`);
      } else {
        setMessage('Failed to award XP');
      }
    } catch (error) {
      setMessage('Error awarding XP');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckLevelUp = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const leveledUp = await checkForLevelUp(user.id);
      setMessage(`Level up check completed. Leveled up: ${leveledUp ? 'Yes' : 'No'}`);
    } catch (error) {
      setMessage('Error checking for level up');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeLevel = () => {
    const currentLevel = lastKnownLevel;
    initializeLevel(currentLevel);
    setMessage(`Initialized level to ${currentLevel}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Level Up Notification Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium text-gray-700">Last Known Level</h3>
              <p className="text-2xl font-bold text-blue-600">{lastKnownLevel}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium text-gray-700">Last Shown Level</h3>
              <p className="text-2xl font-bold text-green-600">{lastShownLevel}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium text-gray-700">User Level</h3>
              <p className="text-2xl font-bold text-purple-600">1</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleAwardXP('DAILY_LOGIN')}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              Award Daily Login XP
            </button>
            <button
              onClick={() => handleAwardXP('CREATE_POST')}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              Award Create Post XP
            </button>
            <button
              onClick={() => handleAwardXP('REPLY_DISCUSSION')}
              disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              Award Reply XP
            </button>
            <button
              onClick={() => handleAwardXP('UPLOAD_IMAGE')}
              disabled={isLoading}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              Award Upload Image XP
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Level Up Detection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleCheckLevelUp}
              disabled={isLoading}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              Check for Level Up
            </button>
            <button
              onClick={handleInitializeLevel}
              disabled={isLoading}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
            >
              Initialize Level
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2">Result</h2>
            <p className="text-gray-700">{message}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">How to Test</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click "Initialize Level" to set your current level as the baseline</li>
            <li>Award XP using the buttons above to increase your level</li>
            <li>Click "Check for Level Up" to trigger the level up notification</li>
            <li>Refresh the page - the level up notification should NOT appear again</li>
            <li>Only new level increases should trigger the notification</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

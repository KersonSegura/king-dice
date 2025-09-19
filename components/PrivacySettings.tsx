'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useToast } from './Toast';

interface PrivacySettingsProps {
  userId: string;
  profileColors?: {
    primary: string;
    secondary: string;
    accent: string;
    containers: string;
  };
}

export default function PrivacySettings({ 
  userId,
  profileColors = {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#fbae17',
    containers: '#ffffff'
  }
}: PrivacySettingsProps) {
  const { showToast, ToastContainer } = useToast();
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Load current privacy settings
  const loadPrivacySettings = async () => {
    try {
      const response = await fetch(`/api/users/privacy?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setIsPrivate(data.privacy.isPrivate);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update privacy settings
  const updatePrivacySettings = async (newPrivacySetting: boolean) => {
    setUpdating(true);
    try {
      const response = await fetch('/api/users/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          isPrivate: newPrivacySetting
        })
      });

      if (response.ok) {
        setIsPrivate(newPrivacySetting);
        showToast(
          newPrivacySetting 
            ? 'Profile set to private' 
            : 'Profile set to public',
          'success'
        );
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update privacy settings', 'error');
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      showToast('Failed to update privacy settings', 'error');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadPrivacySettings();
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
        <div className="space-y-4">
          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              {isPrivate ? (
                <Lock className="w-5 h-5 text-gray-600" />
              ) : (
                <Unlock className="w-5 h-5 text-gray-600" />
              )}
              <div>
                <h4 className="font-medium text-gray-900">
                  {isPrivate ? 'Private Profile' : 'Public Profile'}
                </h4>
                <p className="text-sm text-gray-600">
                  {isPrivate 
                    ? 'Only approved followers can see your posts and profile details'
                    : 'Anyone can follow you and see your posts'
                  }
                </p>
              </div>
            </div>
            
            <button
              onClick={() => updatePrivacySettings(!isPrivate)}
              disabled={updating}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#fbae17] focus:ring-offset-2 ${
                isPrivate ? 'bg-[#fbae17]' : 'bg-gray-200'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="sr-only">Toggle privacy</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isPrivate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

        </div>
      </div>
      
      <ToastContainer />
    </>
  );
}

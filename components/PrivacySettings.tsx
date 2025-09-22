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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Privacy</h3>
          
          {/* Privacy Options */}
          <div className="space-y-3">
            {/* Public Profile Option */}
            <div 
              className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                !isPrivate 
                  ? 'border-[#fbae17] bg-yellow-50' 
                  : 'border-gray-200 hover:border-gray-300'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !updating && (!isPrivate || updatePrivacySettings(false))}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  !isPrivate 
                    ? 'border-[#fbae17] bg-[#fbae17]' 
                    : 'border-gray-300'
                }`}>
                  {!isPrivate && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <Unlock className="w-5 h-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Public Profile</h4>
                  <p className="text-sm text-gray-600">
                    Anyone can follow you and see your posts
                  </p>
                </div>
              </div>
              
              {!isPrivate && (
                <div className="px-3 py-1 bg-[#fbae17] text-white text-sm font-medium rounded-full">
                  Active
                </div>
              )}
            </div>

            {/* Private Profile Option */}
            <div 
              className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                isPrivate 
                  ? 'border-[#fbae17] bg-yellow-50' 
                  : 'border-gray-200 hover:border-gray-300'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !updating && (isPrivate || updatePrivacySettings(true))}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isPrivate 
                    ? 'border-[#fbae17] bg-[#fbae17]' 
                    : 'border-gray-300'
                }`}>
                  {isPrivate && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <Lock className="w-5 h-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Private Profile</h4>
                  <p className="text-sm text-gray-600">
                    Only approved followers can see your posts and profile details
                  </p>
                </div>
              </div>
              
              {isPrivate && (
                <div className="px-3 py-1 bg-[#fbae17] text-white text-sm font-medium rounded-full">
                  Active
                </div>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Public Profile:</strong> Your posts and profile are visible to everyone. Anyone can follow you without approval.<br/>
              <strong>Private Profile:</strong> Your posts are only visible to approved followers. New followers need your approval.
            </p>
          </div>
        </div>
      </div>
      
      <ToastContainer />
    </>
  );
}

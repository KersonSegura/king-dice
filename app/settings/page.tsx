'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Settings, User, Lock, Bell, ArrowLeft, Save, X, CheckCircle, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import PrivacySettings from '@/components/PrivacySettings';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    avatar: user?.avatar || '/DiceLogo.svg'
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    forumNotifications: true,
    galleryNotifications: false,
    marketingEmails: false
  });
  const [security, setSecurity] = useState({
    twoFactorEnabled: false
  });
  const [loading, setLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        avatar: user.avatar
      });
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/settings?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setNotifications(data.settings.notifications || notifications);
          setSecurity(data.settings.security || security);
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const showNotificationToast = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to access settings</h1>
          <Link href="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          username: formData.username,
          email: formData.email
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        showNotificationToast('Profile updated successfully!');
        // Send notification
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            type: 'success',
            message: 'Your profile has been updated successfully',
            title: 'Profile Updated'
          })
        });
      } else {
        const errorData = await response.json();
        showNotificationToast(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotificationToast('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user.username,
      email: user.email,
      avatar: user.avatar
    });
    setIsEditing(false);
  };

  const handleNotificationChange = async (key: string, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);
    
    try {
      await fetch('/api/users/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          settings: { notifications: newNotifications }
        })
      });
      showNotificationToast('Notification settings updated!');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      showNotificationToast('Failed to update notification settings');
    }
  };

  const handleTwoFactorToggle = async () => {
    const newTwoFactorEnabled = !security.twoFactorEnabled;
    
    try {
      const response = await fetch('/api/auth/toggle-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          enabled: newTwoFactorEnabled
        })
      });

      if (response.ok) {
        const newSecurity = { ...security, twoFactorEnabled: newTwoFactorEnabled };
        setSecurity(newSecurity);
        
        showNotificationToast(
          newTwoFactorEnabled 
            ? 'Two-Factor Authentication enabled!' 
            : 'Two-Factor Authentication disabled!'
        );
      } else {
        const errorData = await response.json();
        showNotificationToast(errorData.error || 'Failed to update security settings');
      }
    } catch (error) {
      console.error('Error updating 2FA settings:', error);
      showNotificationToast('Failed to update security settings');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    
    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return;
    }
    
    setLoading(true);
    try {
      // In a real application, this would call a delete account API
      showNotificationToast('Account deletion requested. This feature is not yet implemented.');
    } catch (error) {
      console.error('Error deleting account:', error);
      showNotificationToast('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-6">
          <Link 
            href="/profile" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your account preferences and privacy settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
              </div>
              
              <div className="space-y-4">
                {/* Avatar */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <Image
                      src={formData.avatar}
                      alt="Avatar"
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Profile Picture</p>
                    <p className="text-xs text-gray-500">Click to change (coming soon)</p>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {user.isAdmin && (
                    <p className="text-xs text-green-600 mt-1">✓ Admin username (can contain KingDice variations)</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors ${
                          loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Bell className="w-5 h-5 text-yellow-600" />
                <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.emailNotifications}
                      onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Forum Notifications</p>
                    <p className="text-xs text-gray-500">Get notified about forum activity</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.forumNotifications}
                      onChange={(e) => handleNotificationChange('forumNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Gallery Notifications</p>
                    <p className="text-xs text-gray-500">Get notified about new gallery uploads</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.galleryNotifications}
                      onChange={(e) => handleNotificationChange('galleryNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Marketing Emails</p>
                    <p className="text-xs text-gray-500">Receive promotional content</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.marketingEmails}
                      onChange={(e) => handleNotificationChange('marketingEmails', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Shield className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Privacy Settings</h2>
              </div>
              
              <PrivacySettings
                userId={user?.id || ''}
                profileColors={{
                  primary: '#1f2937',
                  secondary: '#6b7280',
                  accent: '#fbae17',
                  containers: '#ffffff'
                }}
              />
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Security */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Lock className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-900">Security</h2>
              </div>
              
              <div className="space-y-3">
                <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <p className="text-sm font-medium text-gray-700">Change Password</p>
                  <p className="text-xs text-gray-500">Update your account password</p>
                </button>
                
                <button 
                  onClick={handleTwoFactorToggle}
                  disabled={loading}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    security.twoFactorEnabled 
                      ? 'bg-green-50 hover:bg-green-100' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <p className={`text-sm font-medium ${
                    security.twoFactorEnabled ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    Two-Factor Authentication {security.twoFactorEnabled ? '(Enabled)' : '(Disabled)'}
                  </p>
                  <p className="text-xs text-gray-500">Add an extra layer of security</p>
                </button>
                
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h2>
              
              <div className="space-y-3">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className={`w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-red-700">Delete Account</p>
                  <p className="text-xs text-red-600">Permanently remove your account</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5" />
          <span>{notificationMessage}</span>
          <button
            onClick={() => setShowNotification(false)}
            className="ml-2 text-white hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
} 
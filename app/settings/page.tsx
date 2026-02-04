'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Settings, User, Lock, Bell, ArrowLeft, Save, X, CheckCircle, Shield, Award } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import PrivacySettings from '@/components/PrivacySettings';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('common');
  const tSettings = useTranslations('settings');
  const { user, isAuthenticated, logout, isLoading } = useAuth();
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
  const [titleGenderPreference, setTitleGenderPreference] = useState<'masculine' | 'feminine'>('masculine');
  const [loading, setLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('success');
  const [showDeleteConfirm1, setShowDeleteConfirm1] = useState(false);
  const [showDeleteConfirm2, setShowDeleteConfirm2] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

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
          setTitleGenderPreference(data.settings.titleGenderPreference || 'masculine');
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const showNotificationToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{tSettings('pleaseSignIn') || t('pleaseSignIn')}</h1>
          <Link href="/" className="btn-primary">
            {t('goBackHome')}
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
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
        showNotificationToast(tSettings('profileUpdated'), 'success');
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
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: tSettings('failedToUpdateProfile') };
        }
        showNotificationToast(errorData.message || tSettings('failedToUpdateProfile'), 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : tSettings('failedToUpdateProfile');
      showNotificationToast(errorMessage, 'error');
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
      showNotificationToast(tSettings('notificationSettingsUpdated'), 'success');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      showNotificationToast(tSettings('failedToUpdateNotificationSettings'), 'error');
    }
  };

  const handleTitleGenderPreferenceChange = async (preference: 'masculine' | 'feminine') => {
    if (!user?.id) return;
    const previous = titleGenderPreference;
    setTitleGenderPreference(preference);
    
    try {
      await fetch('/api/users/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          settings: { titleGenderPreference: preference }
        })
      });
      showNotificationToast(tSettings('titleGenderPreferenceUpdated'), 'success');
    } catch (error) {
      console.error('Error updating title gender preference:', error);
      showNotificationToast(tSettings('failedToUpdateTitleGenderPreference'), 'error');
      // Revert on error
      setTitleGenderPreference(previous);
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
            ? tSettings('twoFactorEnabled')
            : tSettings('twoFactorDisabled'),
          'success'
        );
      } else {
        const errorData = await response.json();
        showNotificationToast(errorData.error || tSettings('failedToUpdateSecuritySettings'), 'error');
      }
    } catch (error) {
      console.error('Error updating 2FA settings:', error);
      showNotificationToast(tSettings('failedToUpdateSecuritySettings'), 'error');
    }
  };

  const handleDeleteAccount = () => {
    // Show first confirmation
    setShowDeleteConfirm1(true);
  };

  const handleFirstConfirm = () => {
    setShowDeleteConfirm1(false);
    // Show second confirmation after a brief delay
    setTimeout(() => {
      setShowDeleteConfirm2(true);
    }, 100);
  };

  const handleFinalDelete = async () => {
    setShowDeleteConfirm2(false);
    setLoading(true);
    
    try {
      const response = await fetch('/api/users/delete-account', {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      showNotificationToast(tSettings('accountDeleted'), 'success');
      
      // Logout and clear local storage, then redirect to home
      setTimeout(() => {
        if (logout) {
          logout();
        }
        localStorage.clear();
        router.push('/');
      }, 1500);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      showNotificationToast(error.message || tSettings('failedToDeleteAccount'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button - hidden in embed (mobile has home in nav) */}
        <div className="kd-back-to-home mb-6">
          <Link 
            href={`/profile/${user?.username}`} 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {tSettings('backToProfile') || t('backToProfile')}
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{tSettings('accountSettings')}</h1>
          <p className="text-gray-600">{tSettings('manageAccountPreferences')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">{tSettings('profileInformation')}</h2>
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
                    <p className="text-sm text-gray-600">{tSettings('profilePicture')}</p>
                    <p className="text-xs text-gray-500">{tSettings('customizeDiceAvatar')} <Link href="/my-dice" className="text-blue-600 hover:underline">{tSettings('myDiceLink')}</Link></p>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSettings('username')}
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {user.isAdmin && (
                    <p className="text-xs text-green-600 mt-1">✓ {tSettings('adminUsernameNote')}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSettings('emailAddress')}
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
                      <span>{tSettings('editProfile')}</span>
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
                        <span>{loading ? tSettings('saving') : tSettings('saveChanges')}</span>
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>{tSettings('cancel')}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Title Gender Preference */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Award className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">{tSettings('titleGenderPreference')}</h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">{tSettings('titleGenderPreferenceDescription')}</p>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="titleGender"
                      value="masculine"
                      checked={titleGenderPreference === 'masculine'}
                      onChange={() => handleTitleGenderPreferenceChange('masculine')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{tSettings('masculineTitle')}</p>
                      <p className="text-xs text-gray-500">{tSettings('masculineTitleDescription')}</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="titleGender"
                      value="feminine"
                      checked={titleGenderPreference === 'feminine'}
                      onChange={() => handleTitleGenderPreferenceChange('feminine')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{tSettings('feminineTitle')}</p>
                      <p className="text-xs text-gray-500">{tSettings('feminineTitleDescription')}</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Bell className="w-5 h-5 text-yellow-600" />
                <h2 className="text-lg font-semibold text-gray-900">{tSettings('notificationPreferences')}</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{tSettings('emailNotifications')}</p>
                    <p className="text-xs text-gray-500">{tSettings('receiveNotificationsViaEmail')}</p>
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
                    <p className="text-sm font-medium text-gray-700">{tSettings('forumNotifications')}</p>
                    <p className="text-xs text-gray-500">{tSettings('getNotifiedAboutForumActivity')}</p>
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
                    <p className="text-sm font-medium text-gray-700">{tSettings('galleryNotifications')}</p>
                    <p className="text-xs text-gray-500">{tSettings('getNotifiedAboutNewGalleryUploads')}</p>
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
                    <p className="text-sm font-medium text-gray-700">{tSettings('marketingEmails')}</p>
                    <p className="text-xs text-gray-500">{tSettings('receivePromotionalContent')}</p>
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
                <h2 className="text-lg font-semibold text-gray-900">{tSettings('privacySettings')}</h2>
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
                <h2 className="text-lg font-semibold text-gray-900">{tSettings('accountSecurity')}</h2>
              </div>
              
              <div className="space-y-3">
                <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <p className="text-sm font-medium text-gray-700">{tSettings('changePassword')}</p>
                  <p className="text-xs text-gray-500">{tSettings('updateYourAccountPassword')}</p>
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
                    {tSettings('twoFactorAuthentication')} {security.twoFactorEnabled ? tSettings('twoFactorEnabledLabel') : tSettings('twoFactorDisabledLabel')}
                  </p>
                  <p className="text-xs text-gray-500">{tSettings('addExtraLayerOfSecurity')}</p>
                </button>
                
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{tSettings('accountActions')}</h2>
              
              <div className="space-y-3">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className={`w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-red-700">{tSettings('deleteAccount')}</p>
                  <p className="text-xs text-red-600">{tSettings('permanentlyRemoveYourAccount')}</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
          notificationType === 'error' 
            ? 'bg-red-500 text-white' 
            : notificationType === 'info'
            ? 'bg-blue-500 text-white'
            : 'bg-green-500 text-white'
        }`}>
          {notificationType === 'error' ? (
            <X className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          <span>{notificationMessage}</span>
          <button
            onClick={() => setShowNotification(false)}
            className="ml-2 text-white hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* First Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm1}
        onClose={() => setShowDeleteConfirm1(false)}
        onConfirm={handleFirstConfirm}
        title={tSettings('deleteAccountQuestion')}
        message={tSettings('deleteAccountConfirmation')}
        confirmText={tSettings('yesContinue')}
        cancelText={tSettings('cancel')}
        type="danger"
      />

      {/* Second Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm2}
        onClose={() => setShowDeleteConfirm2(false)}
        onConfirm={handleFinalDelete}
        title={tSettings('finalConfirmation')}
        message={tSettings('deleteAccountFinalMessage')}
        confirmText={tSettings('yesDeleteMyAccount')}
        cancelText={tSettings('cancel')}
        type="danger"
      />
    </div>
  );
} 
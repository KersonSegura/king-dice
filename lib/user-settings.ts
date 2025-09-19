import fs from 'fs';
import path from 'path';

export interface UserSettings {
  userId: string;
  notifications: {
    emailNotifications: boolean;
    forumNotifications: boolean;
    galleryNotifications: boolean;
    marketingEmails: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
  };
  lastUpdated: string;
}

// File path for storing user settings
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'user-settings.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Load settings from file
const loadSettings = (): Record<string, UserSettings> => {
  try {
    ensureDataDirectory();
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading user settings:', error);
  }
  return {};
};

// Save settings to file
const saveSettings = (settings: Record<string, UserSettings>) => {
  try {
    ensureDataDirectory();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving user settings:', error);
  }
};

// Get default settings for a user
const getDefaultSettings = (userId: string): UserSettings => ({
  userId,
  notifications: {
    emailNotifications: true,
    forumNotifications: true,
    galleryNotifications: false,
    marketingEmails: false
  },
  security: {
    twoFactorEnabled: false
  },
  lastUpdated: new Date().toISOString()
});

// Get user settings
export function getUserSettings(userId: string): UserSettings {
  const allSettings = loadSettings();
  return allSettings[userId] || getDefaultSettings(userId);
}

// Update user settings
export function updateUserSettings(userId: string, newSettings: Partial<UserSettings>): UserSettings | null {
  const allSettings = loadSettings();
  const currentSettings = allSettings[userId] || getDefaultSettings(userId);
  
  const updatedSettings: UserSettings = {
    ...currentSettings,
    ...newSettings,
    userId,
    lastUpdated: new Date().toISOString()
  };

  allSettings[userId] = updatedSettings;
  saveSettings(allSettings);
  
  console.log('✅ User settings updated for:', userId);
  return updatedSettings;
}

// Send notification to user
export function sendNotification(userId: string, type: 'success' | 'info' | 'warning' | 'error', message: string, title?: string) {
  // In a real application, this would integrate with a notification service
  // For now, we'll just log it and store it in a simple file
  const notification = {
    userId,
    type,
    message,
    title: title || 'King Dice',
    timestamp: new Date().toISOString(),
    read: false
  };

  const notificationsFile = path.join(process.cwd(), 'data', 'notifications.json');
  
  try {
    ensureDataDirectory();
    let notifications = [];
    
    if (fs.existsSync(notificationsFile)) {
      const data = fs.readFileSync(notificationsFile, 'utf8');
      notifications = JSON.parse(data);
    }
    
    notifications.unshift(notification); // Add to beginning
    notifications = notifications.slice(0, 100); // Keep only last 100 notifications
    
    fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
    
    console.log('📧 Notification sent to user:', userId, '-', message);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

import adminConfig from '../config/admins.json';

export interface AdminConfig {
  adminUsers: string[];
  adminEmails: string[];
}

export function isUserAdmin(userId?: string, username?: string, email?: string): boolean {
  if (!adminConfig) return false;
  
  const config = adminConfig as AdminConfig;
  
  // Check by user ID
  if (userId && config.adminUsers.includes(userId)) {
    return true;
  }
  
  // Check by username
  if (username && config.adminUsers.includes(username)) {
    return true;
  }
  
  // Check by email
  if (email && config.adminEmails.includes(email)) {
    return true;
  }
  
  return false;
}

export function getAdminConfig(): AdminConfig {
  return adminConfig as AdminConfig;
}

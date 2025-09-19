import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  reputation: number;
  joinDate: string;
  isVerified: boolean;
  isAdmin: boolean;
  title?: string;
}

// File path for storing users
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Load users from file
const loadUsers = (): User[] => {
  try {
    ensureDataDirectory();
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return [];
};

// Save users to file
const saveUsers = (users: User[]) => {
  try {
    ensureDataDirectory();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
};

// Initialize users array
let users: User[] = loadUsers();

// Create default admin user if no users exist
if (users.length === 0) {
  const adminUser: User = {
    id: 'admin',
    username: 'KingDiceAdmin',
    email: 'admin@kingdice.com',
    avatar: '/DiceLogo.svg',
    reputation: 1000,
    joinDate: new Date().toISOString(),
    isVerified: true,
    isAdmin: true
  };
  
  users.push(adminUser);
  saveUsers(users);
}

export function getAllUsers(): User[] {
  return [...users];
}

export function getUserById(userId: string): User | null {
  return users.find(user => user.id === userId) || null;
}

export function getUserByUsername(username: string): User | null {
  return users.find(user => user.username === username) || null;
}

export function getUserByEmail(email: string): User | null {
  return users.find(user => user.email === email) || null;
}

export function createUser(userData: Omit<User, 'id' | 'joinDate' | 'reputation' | 'isVerified' | 'isAdmin'>, isAdmin: boolean = false): User {
  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username: userData.username,
    email: userData.email,
    avatar: userData.avatar,
    reputation: isAdmin ? 100 : 0,
    joinDate: new Date().toISOString(),
    isVerified: isAdmin,
    isAdmin: isAdmin
  };

  users.push(newUser);
  saveUsers(users);
  
  return newUser;
}

export function updateUserReputation(userId: string, change: number): User | null {
  const userIndex = users.findIndex(user => user.id === userId);
  if (userIndex === -1) return null;

  const user = users[userIndex];
  const updatedUser: User = {
    ...user,
    reputation: Math.max(0, user.reputation + change)
  };

  users[userIndex] = updatedUser;
  saveUsers(users);
  
  return updatedUser;
}

export function isUserVerified(userId: string): boolean {
  const user = getUserById(userId);
  return user?.isVerified || false;
}

export function updateUserAvatar(userId: string, avatarUrl: string): User | null {
  console.log('🔄 Updating avatar for user ID:', userId);
  console.log('🔄 New avatar URL:', avatarUrl);
  console.log('🔄 Available users:', users.map(u => ({ id: u.id, username: u.username })));
  
  const userIndex = users.findIndex(user => user.id === userId);
  console.log('🔄 User index found:', userIndex);
  
  if (userIndex === -1) {
    console.log('❌ User not found with ID:', userId);
    return null;
  }

  const user = users[userIndex];
  console.log('🔄 Found user:', { id: user.id, username: user.username, currentAvatar: user.avatar });
  
  const updatedUser: User = {
    ...user,
    avatar: avatarUrl
  };

  users[userIndex] = updatedUser;
  saveUsers(users);
  
  console.log('✅ Avatar updated successfully for user:', updatedUser.username);
  console.log('✅ New avatar URL:', updatedUser.avatar);
  
  return updatedUser;
}

export function updateUserTitle(userId: string, title: string): User | null {
  console.log('👑 Updating title for user ID:', userId);
  console.log('👑 New title:', title);
  
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    console.log('❌ User not found with ID:', userId);
    return null;
  }

  const user = users[userIndex];
  console.log('👑 Found user:', { id: user.id, username: user.username, currentTitle: user.title });
  
  const updatedUser: User = {
    ...user,
    title: title
  };

  users[userIndex] = updatedUser;
  saveUsers(users);
  
  console.log('✅ Title updated successfully for user:', updatedUser.username);
  console.log('✅ New title:', updatedUser.title);
  
  return updatedUser;
}

export function updateUser(userId: string, updates: Partial<Pick<User, 'username' | 'email'>>): User | null {
  console.log('🔄 Updating user profile for ID:', userId);
  console.log('🔄 Updates:', updates);
  
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    console.log('❌ User not found with ID:', userId);
    return null;
  }

  const user = users[userIndex];
  const updatedUser: User = {
    ...user,
    ...updates
  };

  users[userIndex] = updatedUser;
  saveUsers(users);
  
  console.log('✅ User profile updated successfully');
  return updatedUser;
}

export function containsKingDiceVariation(username: string): boolean {
  const kingDicePatterns = [
    /kingdice/i,
    /king\.dice/i,
    /king_dice/i,
    /king-dice/i,
    /king dice/i
  ];
  
  return kingDicePatterns.some(pattern => pattern.test(username));
} 
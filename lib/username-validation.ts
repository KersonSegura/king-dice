import { supabaseAdmin } from './supabase';

// List of prohibited words (vulgar, obscene, insults, etc.)
// In production, this should be more comprehensive and possibly stored in the database
const PROHIBITED_WORDS = [
  // Vulgar/obscene words (common ones - you may want to expand this list)
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'crap', 'piss',
  // Slurs and offensive terms
  // Add more as needed
];

/**
 * Normalize a string for comparison (lowercase, trim, remove extra spaces)
 */
function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9\s]/g, '');
}

/**
 * Check if username contains prohibited words
 */
export function containsProhibitedWords(username: string): boolean {
  const normalized = normalizeString(username);
  
  for (const word of PROHIBITED_WORDS) {
    // Check if the word appears as a whole word (not just as part of another word)
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(username)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if username exactly matches a game name (case-insensitive)
 * Returns true if it's an exact match, false if it's a partial match (like "Catan123")
 */
export async function isExactGameNameMatch(username: string): Promise<{ isMatch: boolean; gameName?: string }> {
  try {
    const normalizedUsername = normalizeString(username);
    
    // Search for games with exact name match (case-insensitive)
    // Check all name fields: nameEn, nameEs, and name
    const { data: games, error } = await supabaseAdmin
      .from('games')
      .select('id, nameEn, nameEs, name')
      .limit(1000); // Get a reasonable number of games to check
    
    if (error) {
      console.error('Error checking game names:', error);
      // If there's an error, don't block registration - allow it
      return { isMatch: false };
    }
    
    if (!games || games.length === 0) {
      return { isMatch: false };
    }
    
    // Check each game's name fields
    for (const game of games) {
      const nameEn = game.nameEn ? normalizeString(game.nameEn) : '';
      const nameEs = game.nameEs ? normalizeString(game.nameEs) : '';
      const name = game.name ? normalizeString(game.name) : '';
      
      // Exact match (case-insensitive)
      if (normalizedUsername === nameEn || normalizedUsername === nameEs || normalizedUsername === name) {
        return { 
          isMatch: true, 
          gameName: game.nameEn || game.nameEs || game.name || 'Unknown Game'
        };
      }
    }
    
    return { isMatch: false };
  } catch (error) {
    console.error('Error in isExactGameNameMatch:', error);
    // If there's an error, don't block registration - allow it
    return { isMatch: false };
  }
}

/**
 * Validate username for registration
 * Returns { valid: boolean, reason?: string }
 */
export async function validateUsername(username: string): Promise<{ valid: boolean; reason?: string }> {
  // Check length
  if (username.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 30) {
    return { valid: false, reason: 'Username must be 30 characters or less' };
  }
  
  // Check for prohibited words
  if (containsProhibitedWords(username)) {
    return { valid: false, reason: 'Username contains inappropriate language. Please choose a different username.' };
  }
  
  // Check for exact game name matches
  const gameMatch = await isExactGameNameMatch(username);
  if (gameMatch.isMatch) {
    return { 
      valid: false, 
      reason: `"${gameMatch.gameName}" is a game in our database. Please choose a different username (you can add numbers or variations, like "${username}123").` 
    };
  }
  
  // Check for KingDice variations (already handled in register, but good to have here too)
  const containsKingDiceVariation = (username: string): boolean => {
    const kingDiceVariations = ['kingdice', 'king-dice', 'king_dice', 'king dice'];
    const lowerUsername = username.toLowerCase();
    return kingDiceVariations.some(variation => lowerUsername.includes(variation));
  };
  
  if (containsKingDiceVariation(username)) {
    return { valid: false, reason: 'Username cannot contain "KingDice" variations. This name is reserved.' };
  }
  
  return { valid: true };
}

/**
 * Check if any existing users have usernames that conflict with a new game name
 * Returns array of users with conflicting usernames (id and username)
 */
export async function findConflictingUsernames(gameName: string): Promise<Array<{ id: string; username: string }>> {
  try {
    const normalizedGameName = normalizeString(gameName);
    const conflictingUsers: Array<{ id: string; username: string }> = [];
    
    // Get all users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .limit(10000); // Reasonable limit
    
    if (error) {
      console.error('Error finding conflicting usernames:', error);
      return [];
    }
    
    if (!users || users.length === 0) {
      return [];
    }
    
    // Check each user's username
    for (const user of users) {
      const normalizedUsername = normalizeString(user.username);
      
      // Exact match (case-insensitive)
      if (normalizedUsername === normalizedGameName) {
        conflictingUsers.push({ id: user.id, username: user.username });
      }
    }
    
    return conflictingUsers;
  } catch (error) {
    console.error('Error in findConflictingUsernames:', error);
    return [];
  }
}

/**
 * Generate a new username by adding random numbers (format: originalName0123)
 */
function generateNewUsername(originalUsername: string): string {
  // Generate a random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  return `${originalUsername}${randomNum}`;
}

/**
 * Auto-rename conflicting users when a game is added
 * Returns array of renamed users with old and new usernames
 */
export async function autoRenameConflictingUsers(gameName: string): Promise<Array<{ userId: string; oldUsername: string; newUsername: string }>> {
  try {
    const conflictingUsers = await findConflictingUsernames(gameName);
    const renamedUsers: Array<{ userId: string; oldUsername: string; newUsername: string }> = [];
    
    for (const user of conflictingUsers) {
      let newUsername = generateNewUsername(user.username);
      let attempts = 0;
      const maxAttempts = 10;
      
      // Ensure the new username doesn't already exist
      while (attempts < maxAttempts) {
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .ilike('username', newUsername)
          .limit(1);
        
        if (!existingUser || existingUser.length === 0) {
          // Username is available
          break;
        }
        
        // Try again with a different random number
        newUsername = generateNewUsername(user.username);
        attempts++;
      }
      
      // Update the username
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ username: newUsername })
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`Error renaming user ${user.id}:`, updateError);
        continue;
      }
      
      renamedUsers.push({
        userId: user.id,
        oldUsername: user.username,
        newUsername: newUsername
      });
      
      console.log(`✅ Auto-renamed user ${user.id} from "${user.username}" to "${newUsername}"`);
    }
    
    return renamedUsers;
  } catch (error) {
    console.error('Error in autoRenameConflictingUsers:', error);
    return [];
  }
}


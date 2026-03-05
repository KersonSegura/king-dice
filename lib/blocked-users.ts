import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get the list of user IDs that the given user has blocked.
 * This includes users that the current user blocked (user_id = currentUserId with status='blocked')
 */
export async function getBlockedUserIds(currentUserId: string): Promise<string[]> {
  if (!currentUserId) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from('friendships')
      .select('friend_id')
      .eq('user_id', currentUserId)
      .eq('status', 'blocked');

    if (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }

    return (data || []).map((row: { friend_id: string }) => row.friend_id);
  } catch (error) {
    console.error('Error in getBlockedUserIds:', error);
    return [];
  }
}

/**
 * Get the list of user IDs that have blocked the given user.
 * This includes users where friend_id = currentUserId with status='blocked'
 */
export async function getUsersWhoBlockedMe(currentUserId: string): Promise<string[]> {
  if (!currentUserId) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from('friendships')
      .select('user_id')
      .eq('friend_id', currentUserId)
      .eq('status', 'blocked');

    if (error) {
      console.error('Error fetching users who blocked me:', error);
      return [];
    }

    return (data || []).map((row: { user_id: string }) => row.user_id);
  } catch (error) {
    console.error('Error in getUsersWhoBlockedMe:', error);
    return [];
  }
}

/**
 * Get all blocked user IDs (both users I blocked and users who blocked me).
 * Content from these users should be hidden from feeds.
 */
export async function getAllBlockedUserIds(currentUserId: string): Promise<string[]> {
  if (!currentUserId) return [];

  const [blockedByMe, blockedMe] = await Promise.all([
    getBlockedUserIds(currentUserId),
    getUsersWhoBlockedMe(currentUserId),
  ]);

  const allBlocked = new Set([...blockedByMe, ...blockedMe]);
  return Array.from(allBlocked);
}

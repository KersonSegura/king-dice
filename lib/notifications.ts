import { supabaseAdmin } from '@/lib/supabase';

export type NotificationType =
  | 'follow'
  | 'follow_request'
  | 'comment'
  | 'reply'
  | 'like'
  | 'message'
  | 'system';

export async function createNotification(params: {
  userId: string; // receiver
  type: NotificationType;
  actorId?: string; // who caused it
  entityType?: string; // 'post' | 'comment' | 'chat' | etc
  entityId?: string | number;
  url?: string;
  message?: string;
}) {
  const { userId, type, actorId, entityType, entityId, url, message } = params;
  try {
    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type,
      actor_id: actorId || null,
      entity_type: entityType || null,
      entity_id: entityId ?? null,
      url: url || null,
      message: message || null,
      read: false,
    });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.error('createNotification error:', e);
    return { success: false };
  }
}



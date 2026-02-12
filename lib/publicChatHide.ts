const HIDDEN_PUBLIC_CHATS_KEY = 'kd_hidden_public_chats';

function safeParseArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function getHiddenPublicChats(): string[] {
  if (typeof window === 'undefined') return [];
  return safeParseArray(localStorage.getItem(HIDDEN_PUBLIC_CHATS_KEY));
}

export function setHiddenPublicChats(names: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HIDDEN_PUBLIC_CHATS_KEY, JSON.stringify(names));
  } catch {}
}

export function hidePublicChat(chatName: string): string[] {
  const current = getHiddenPublicChats();
  if (current.includes(chatName)) return current;
  const next = [...current, chatName];
  setHiddenPublicChats(next);
  return next;
}

export function unhidePublicChat(chatName: string): string[] {
  const current = getHiddenPublicChats();
  const next = current.filter((n) => n !== chatName);
  if (next.length !== current.length) setHiddenPublicChats(next);
  return next;
}


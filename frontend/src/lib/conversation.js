const STORAGE_KEY = 'amaia-sales-conversation-id';

function createConversationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `conv_${crypto.randomUUID()}`;
  }

  return `conv_${Date.now()}`;
}

export function getOrCreateConversationId() {
  if (typeof window === 'undefined') return 'conv_server';
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = createConversationId();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}

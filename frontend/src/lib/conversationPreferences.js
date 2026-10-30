export function isConversationMuted(userId, conversationId) {
  try { return localStorage.getItem(`cloudchat-muted:${userId}:${conversationId}`) === 'true'; } catch { return false; }
}
export function setConversationMuted(userId, conversationId, muted) {
  try { localStorage.setItem(`cloudchat-muted:${userId}:${conversationId}`, String(muted)); } catch {}
}

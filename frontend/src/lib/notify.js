import { nebulaMessage } from './nebula.js';
import { memberName, roomName } from '../store/nebula.js';
import { isAccountRestricted } from '../store/accountPolicies.js';
import { useNotifications } from '../store/notifications.js';
import { useChat } from '../store/chat.js';
import { useAuth } from '../store/auth.js';
import { parseReply } from './reply.js';
import { isConversationMuted } from './conversationPreferences.js';
import { mentionParts } from './mentions.js';
export function notifyMessage(msg) {
  if (nebulaMessage(msg?.content)?.hidden) return;
  const user = useAuth.getState().user;
  if (!user || !msg?.id || String(msg.senderId) === String(user.id)) return;
  const state = useChat.getState();
  const conv = state.items.find((c) => String(c.id) === String(msg.conversationId));
  if (!conv) return;
  if (conv.type === "DIRECT" && conv.others?.some((o) => isAccountRestricted(o.id))) return;
  const mentioned = conv.type === 'GROUP' && mentionParts(parseReply(msg.content)?.text ?? msg.content, [user.username, user.username?.replaceAll(' ', '_'), memberName(conv.id,user.id,user.username), memberName(conv.id,user.id,user.username)?.replaceAll(' ', '_'), 'Tất cả']).some((p) => p.name);
  const visible = String(state.selectedId) === String(conv.id) || (state.splitOpen && String(state.secondaryId) === String(conv.id));
  if (!mentioned && visible) return;
  const name = state.members[String(conv.id)]?.find((m) => String(m.id) === String(msg.senderId))?.username ?? 'Thành viên';
  const notification = { id: `message-${conv.id}-${msg.id}`, kind: mentioned ? 'mention' : 'message', conversationId: conv.id, text: mentioned ? `${name} đã nhắc đến bạn trong nhóm [${conv.displayName}]` : `${name} gửi tin nhắn · ${conv.displayName}`, detail: parseReply(msg.content)?.text ?? msg.content };
  if (mentioned) useNotifications.getState().push(notification);
  else if (!isConversationMuted(user.id, conv.id)) useNotifications.getState().toast(notification);
}

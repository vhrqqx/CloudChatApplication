import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useChat } from '../../store/chat.js';
import { useAccountPolicies } from '../../store/accountPolicies.js';
import { useFriends } from '../../store/friends.js';
import Avatar from '../Avatar.jsx';

const fold = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
export default function ConversationPicker({ secondary, onChoose, onCancel, excludeId }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const items = useChat((s) => s.items);
  const splitOpposite = useChat((s) => secondary ? s.selectedId : s.secondaryId);
  const opposite = excludeId !== undefined ? excludeId : splitOpposite;
  const policies = useAccountPolicies((s) => s.items);
  const restricted = (id) => policies.some((p) => String(p.targetId) === String(id) && (p.hidden || p.blocked));
  const friends = useFriends((s) => s.friends).filter((f) => !restricted(f.userId));
  useEffect(() => { useFriends.getState().load(); }, []);
  const available = items.filter((c) => String(c.id) !== String(opposite) && (c.type !== "DIRECT" || !c.others?.some((o) => restricted(o.id))));
  const friendsWithoutChat = friends.filter((f) => !items.some((c) => c.type === 'DIRECT' && c.others?.some((o) => String(o.id) === String(f.userId))));
  const choices = [...available.map((c) => ({ key: `chat-${c.id}`, name: c.displayName || `Hội thoại #${c.id}`, group: c.type === 'GROUP', id: c.id })), ...friendsWithoutChat.map((f) => ({ key: `friend-${f.userId}`, name: f.username, friendId: f.userId }))].filter((c) => fold(c.name).includes(fold(query)));
  async function choose(choice) {
    setBusy(true); setError(null);
    try {
      let id = choice.id;
      if (!id) {
        const original = useChat.getState().selectedId;
        try { id = (await useChat.getState().create({ conversationType: 'DIRECT', memberId: [choice.friendId] })).id; }
        finally { useChat.setState({ selectedId: original }); }
      }
      onChoose(id);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="flex h-full min-h-0 flex-col" style={{ color: 'var(--text-primary)', fontSize: 13 }}>
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4" style={{ borderColor: 'var(--border)' }}><strong>Chọn hội thoại bên {secondary ? 'phải' : 'trái'}</strong><button className="m9-icon" title="Hủy chọn" aria-label="Hủy chọn" onClick={onCancel}><X size={16} /></button></header>
    <div className="p-3"><input autoFocus className="m9-filter" placeholder="Tìm bạn bè hoặc nhóm…" aria-label="Tìm hội thoại để mở" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    {error && <p role="alert" className="px-3" style={{ color: 'var(--destructive)' }}>{error}</p>}
    <div className="min-h-0 flex-1 overflow-y-auto px-3">{choices.map((c) => <button key={c.key} disabled={busy} onClick={() => choose(c)} className="flex w-full items-center gap-3 border-b py-3 text-left hover:bg-[var(--bg-item-hover)]" style={{ borderColor: 'var(--border)' }}><Avatar name={c.name} isGroup={c.group} size={36} /><span className="min-w-0"><strong className="block truncate">{c.name}</strong><span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.group ? 'Nhóm' : 'Bạn bè'}</span></span></button>)}{!choices.length && <p style={{ color: 'var(--text-secondary)' }}>Không có hội thoại phù hợp. Hãy kết bạn để bắt đầu chat riêng.</p>}</div>
  </div>;
}

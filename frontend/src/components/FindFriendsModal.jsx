import { useEffect, useState } from 'react';
import { UserPlus, X } from '@phosphor-icons/react';
import Dialog from './Dialog.jsx';
import Avatar from './Avatar.jsx';
import ProfileCard from './ProfileCard.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../store/auth.js';
import { useFriends } from '../store/friends.js';
import { useChat } from '../store/chat.js';

const normalize = (text) => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
export default function FindFriendsModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [profile, setProfile] = useState(null);
  const myId = useAuth((s) => s.user?.id);
  const relations = useFriends();
  useEffect(() => {
    let alive = true;
    useFriends.getState().load();
    (async () => {
      const all = [];
      for (let page = 0; ; page++) {
        const response = await api(`/user?page=${page}&size=100`);
        if (!alive) return;
        const rows = response?.content ?? [];
        all.push(...rows);
        if (rows.length < 100 || response?.page?.totalPages <= page + 1) break;
      }
      if (alive) setUsers(all);
    })().catch((e) => alive && setError(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);
  async function act(user) {
    setBusy(user.id); setError(null);
    try {
      const relation = relations.relation(user.id);
      if (relation === 'friends') {
        await useChat.getState().openOrCreateDirectConversation(user.id);
        onClose();
      } else if (relation === 'incoming') {
        await relations.accept(relations.incoming.find((r) => String(r.otherId) === String(user.id)).requestId);
      } else await relations.send(user.id);
    } catch (e) { setError(e.message); } finally { setBusy(null); }
  }
  const shown = query.trim() ? users.filter((u) => String(u.id) !== String(myId) && normalize(`${u.username} ${u.email ?? u.userEmail ?? ''}`).includes(normalize(query.trim()))) : [];
  return <>{!profile ? <Dialog onClose={onClose} labelledById="find-friends-title" width="min(440px, calc(100vw - 24px))" elevated={false}>
    <div className="p-4" style={{ color: 'var(--text-primary)', fontSize: 13 }}>
      <div className="mb-3 flex items-center justify-between"><h2 id="find-friends-title" style={{ fontSize: 14, fontWeight: 600 }}>Thêm bạn</h2><button className="m9-icon" aria-label="Đóng" onClick={onClose}><X size={20} /></button></div>
      <input autoFocus type="search" className="m9-filter" style={{ height: 36 }} placeholder="Tìm tên hoặc email…" aria-label="Tìm tên hoặc email" value={query} onChange={(e) => setQuery(e.target.value)} />
      {error && <p role="alert" style={{ color: 'var(--destructive)' }}>{error}</p>}
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {query.trim() && loading && <p role="status">Đang tìm người dùng…</p>}
        {query.trim() && !loading && !shown.length && <p>Không tìm thấy người dùng phù hợp.</p>}
        {shown.map((user) => { const relation = relations.relation(user.id); return <div key={user.id} className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <button aria-label={`Xem hồ sơ ${user.username}`} onClick={() => setProfile(user)}><Avatar name={user.username} size={36} /></button>
          <button className="min-w-0 flex-1 text-left" onClick={() => setProfile(user)}><span className="block truncate" style={{ fontSize: 14, fontWeight: 600 }}>{user.username}</span><span className="block truncate" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.email ?? user.userEmail ?? `ID #${user.id}`}</span></button>
          <button disabled={busy !== null || relation === 'outgoing'} onClick={() => act(user)} className="flex items-center gap-1 px-2 py-2" style={{ borderRadius: 6, fontSize: 12, background: relation === 'outgoing' ? 'var(--bg-rail)' : 'var(--accent)', color: relation === 'outgoing' ? 'var(--text-secondary)' : 'var(--on-accent)' }}>{relation === 'none' && <UserPlus size={14} />}{busy === user.id ? 'Đang xử lý…' : ({ friends: 'Nhắn tin', outgoing: 'Đã gửi lời mời', incoming: 'Đồng ý', none: 'Kết bạn' })[relation]}</button>
        </div>; })}
      </div>
    </div>
  </Dialog> : <ProfileCard open userId={profile.id} username={profile.username} onClose={() => setProfile(null)} />}</>;
}

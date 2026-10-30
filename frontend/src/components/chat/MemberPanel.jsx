import { useEffect, useRef, useState } from 'react';
import { UserCircle, Bell, BellSlash, MagnifyingGlass, CaretDown, Image, FileText } from '@phosphor-icons/react';
import { CommunityTools, MetadataButton } from "../nebula/CommunityTools.jsx";
import { useNebula, roomName, hierarchy } from "../../store/nebula.js";
import GroupMembers from './GroupMembers.jsx';
import Avatar from '../Avatar.jsx';
import ProfileCard from '../ProfileCard.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import ThemeToggle from '../ThemeToggle.jsx';
import { useAuth } from '../../store/auth.js';
import { useUi } from '../../store/ui.js';
import { useChat } from '../../store/chat.js';
import { useAccountPolicies } from '../../store/accountPolicies.js';
import { useFriends } from '../../store/friends.js';
import { api } from '../../lib/api.js';
import { isConversationMuted, setConversationMuted } from '../../lib/conversationPreferences.js';
import { replyExcerpt } from '../../lib/reply.js';
import { stickerOf } from '../../data/stickers.js';

export default function MemberPanel({ conv, onMedia }) {
  return <DirectMemberPanel key={conv.id} conv={conv} onMedia={onMedia} />;
}
function Section({ title, children }) {
  return <details className="direct-info-section"><summary>{title}<CaretDown size={14} /></summary><div className="direct-info-section-body">{children}</div></details>;
}
const fold = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi,'d').toLowerCase();
function DirectMemberPanel({ conv, onMedia }) {
  useNebula(s=>s.records);
  const [profile, setProfile] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [details, setDetails] = useState(null);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const input = useRef(null);
  const isGroup = conv.type === "GROUP";
  const other = isGroup ? null : conv.others?.[0];
  const [privacyAction, setPrivacyAction] = useState(null);
  const userId = useAuth((s) => s.user?.id);
  const online = useUi((s) => s.presence[String(other?.id)]);
  const friends = useFriends((s) => s.friends);
  const isFriend = friends.some((f) => String(f.userId) === String(other?.id));
  const [muted, setMuted] = useState(() => isConversationMuted(userId, conv.id));
  useEffect(() => {
    let alive = true;
    if (other?.id) api(`/user/${other.id}`).then((u) => { if (alive) setDetails(u); }).catch(() => {});
    return () => { alive = false; };
  }, [other?.id]);
  useEffect(() => {
    if (!search) return;
    input.current?.focus();
    const controller = new AbortController();
    setLoading(true); setError(null);
    (async () => {
      const messages = [];
      for (let page = 0; ; page++) {
        const result = await api(`/message?conversationId=${conv.id}&page=${page}&size=100`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const rows = result?.content ?? []; messages.push(...rows);
        if (rows.length < 100 || result?.last || result?.page?.totalPages <= page + 1) break;
      }
      setHistory(messages);
    })().catch((e) => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, conv.id]);
  const results = query.trim() ? history.filter((m) => fold(m.content).includes(fold(query.trim()))) : [];
  return <aside className="direct-info" aria-label="Thông tin hội thoại riêng">
    <div className="direct-info-profile"><button disabled={!other} aria-label={`Xem hồ sơ ${conv.displayName}`} onClick={() => setProfile(true)}><Avatar name={conv.displayName ?? ''} isGroup={isGroup} size={64} /></button><div className="flex items-center gap-1"><strong>{roomName(conv)}</strong><MetadataButton conv={conv} type={isGroup?"rename":"nickname"}/></div>{details?.email && <span>{details.email}</span>}{online === true && <span>Đang hoạt động</span>}</div>
    <div className="direct-info-actions" style={isGroup ? { gridTemplateColumns: "repeat(2,minmax(0,1fr))" } : undefined}>
      {!isGroup && <button disabled={!other} onClick={() => setProfile(true)}><span><UserCircle size={20} /></span>Hồ sơ</button>}
      <button aria-pressed={muted} title={muted ? 'Bật thông báo' : 'Tắt thông báo'} onClick={() => { const next = !muted; setMuted(next); setConversationMuted(userId, conv.id, next); }}><span>{muted ? <BellSlash size={20} /> : <Bell size={20} />}</span>{muted ? 'Bật thông báo' : 'Tắt thông báo'}</button>
      <button aria-expanded={search} onClick={() => setSearch((v) => !v)}><span><MagnifyingGlass size={20} /></span>Tìm kiếm</button>
    </div>
    {search && <div className="direct-search"><input ref={input} className="m9-filter" aria-label="Tìm tin nhắn trong hội thoại" placeholder="Tìm trong cuộc trò chuyện…" value={query} onChange={(e) => setQuery(e.target.value)} />{loading && <p role="status">Đang tải lịch sử…</p>}{error && <p role="alert">{error}</p>}<div className="direct-search-results">{!loading && query.trim() && !results.length && <p>Không tìm thấy tin nhắn.</p>}{results.map((m) => <button key={m.id} onClick={() => window.dispatchEvent(new CustomEvent('cloudchat:jump-message', { detail: { conversationId: conv.id, messageId: m.id } }))}><span className="block truncate">{stickerOf(m.content)?.name ?? replyExcerpt(m.content)}</span><small>{new Date(m.createdAt).toLocaleString('vi-VN')}</small></button>)}</div></div>}
    <Section title="Thông tin đoạn chat">{!isGroup && <button onClick={() => setProfile(true)}>Xem hồ sơ {other?.username ?? conv.displayName}</button>}{isGroup && <p>{conv.membersCount} thành viên</p>}<p>Bắt đầu: {new Date(conv.createdAt).toLocaleDateString('vi-VN')}</p></Section>
    <Section title="Tùy chỉnh đoạn chat"><div className="flex items-center justify-between"><span>Giao diện sáng / tối</span><ThemeToggle /></div></Section>
    {isGroup && <CommunityTools conv={conv}/>}
    {isGroup && <Section title="Thành viên nhóm"><GroupMembers key={conv.id} conv={conv} /></Section>}
    <Section title="Ảnh và tệp"><button onClick={() => onMedia?.('images')}><Image size={16} />Ảnh đã chia sẻ</button><button onClick={() => onMedia?.('files')}><FileText size={16} />Tệp và liên kết</button></Section>
    <Section title="Quyền riêng tư và hỗ trợ"><button onClick={() => { const next = !muted; setMuted(next); setConversationMuted(userId, conv.id, next); }}>{muted ? 'Bật thông báo hội thoại' : 'Tắt thông báo hội thoại'}</button>{!isGroup && other && <><button onClick={() => setPrivacyAction("blocked")}>Chặn tài khoản</button><button onClick={() => setPrivacyAction("hidden")}>Ẩn tài khoản</button></>}{!isGroup && isFriend && <button style={{ color:'var(--destructive)' }} onClick={() => setConfirm(true)}>Hủy kết bạn</button>}<p>{isGroup ? "Quản lý vai trò và rời nhóm trong mục Thành viên nhóm." : "Tài khoản bị ẩn vẫn gửi được tin; hội thoại và thông báo được ẩn cho đến khi bạn bỏ ẩn trong Cài đặt."}</p></Section>
    <ProfileCard open={profile} onClose={() => setProfile(false)} userId={other?.id} username={other?.username} contextConversationId={conv.id} sourceConversationId={null} />
    <ConfirmDialog open={!!privacyAction} title={privacyAction === 'blocked' ? 'Chặn tài khoản?' : 'Ẩn tài khoản?'} description={privacyAction === 'blocked' ? 'Chặn nhắn tin riêng giữa hai tài khoản. Chỉ gỡ chặn trong Hồ sơ & Cài đặt.' : 'Ẩn hội thoại và tắt mọi thông báo của người này. Họ vẫn gửi được tin. Chỉ bỏ ẩn trong Hồ sơ & Cài đặt.'} confirmLabel="Xác nhận" onClose={() => setPrivacyAction(null)} action={async () => { await useAccountPolicies.getState().update(other.id, { [privacyAction]: true }); const chat = useChat.getState(); if (String(chat.selectedId) === String(conv.id)) chat.select(null); if (String(chat.secondaryId) === String(conv.id)) chat.closeSplit(); }} />
    <ConfirmDialog open={confirm} title="Hủy kết bạn?" description={`Bạn muốn hủy kết bạn với ${conv.displayName}?`} confirmLabel="Hủy kết bạn" onClose={() => setConfirm(false)} action={() => useFriends.getState().unfriend(other.id)} />
  </aside>;
}

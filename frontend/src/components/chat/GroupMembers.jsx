import { useEffect, useId, useRef, useState } from 'react';
import { X, Crown } from '@phosphor-icons/react';
import { MetadataButton } from "../nebula/CommunityTools.jsx";
import { useNebula, memberName, metaFor } from "../../store/nebula.js";
import Avatar from '../Avatar.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import ProfileCard from '../ProfileCard.jsx';
import { useChat } from '../../store/chat.js';
import { useAuth } from '../../store/auth.js';
import { useFriends } from '../../store/friends.js';
import { useUi } from '../../store/ui.js';
import { api } from '../../lib/api.js';
function MemberRow({ conv, member, pending, admin, myId, busy, onRole, onRemove, onProfile, onTransfer }) {
  const [expanded, setExpanded] = useState(!pending);
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setExpanded(true))); return () => cancelAnimationFrame(id); }, []);
  return <li className="ux-member-enter" data-expanded={expanded}><div><div className="ux-member-row">
    <button className="shrink-0" aria-label={`Xem hồ sơ ${member.username}`} onClick={onProfile}><Avatar name={member.username} size={32} /></button>
    <div className="min-w-0 flex-1"><strong className="block truncate">{memberName(conv.id,member.id,member.username)}</strong>{pending && <span className="ux-member-status" data-pending={pending === 'pending'}>{pending === 'pending' ? 'Đang thêm…' : 'Đã vào nhóm'}</span>}</div>
    <MetadataButton conv={conv} type="nickname" userId={member.id}/>
    <button key={member.role} className="ux-role" disabled={!admin || String(member.id) === String(myId) || busy || pending === 'pending'} aria-label={`Đổi vai trò ${member.username}`} onClick={onRole}>{busy ? 'Đang đổi…' : member.role === 'ADMIN' ? 'Quản trị' : 'Thành viên'}</button>
    {admin && member.role === 'MEMBER' && String(member.id) !== String(myId) && !pending && <button type="button" className="m9-icon" disabled={busy} title="Chuyển quyền Quản trị" aria-label={`Chuyển quyền Quản trị cho ${member.username}`} onClick={onTransfer}><Crown size={14} /></button>}
    {admin && String(member.id) !== String(myId) && !pending && <button className="ux-member-remove" aria-label={`Xóa ${member.username} khỏi nhóm`} onClick={onRemove}><X size={14} /></button>}
  </div></div></li>;
}
export default function GroupMembers({ conv }) {
  useNebula(s=>s.records);
  const members = useChat((s) => s.members[String(conv.id)]);
  const friends = useFriends((s) => s.friends);
  const friendStatus = useFriends((s) => s.status);
  const friendError = useFriends((s) => s.error);
  const myId = useAuth((s) => s.user?.id);
  const admin = members?.find((m) => String(m.id) === String(myId))?.role === 'ADMIN';
  const [query, setQuery] = useState(''), [selected, setSelected] = useState(null), [role, setRole] = useState('MEMBER');
  const [dropdown, setDropdown] = useState(false), [index, setIndex] = useState(0);
  const [pending, setPending] = useState(null), [busy, setBusy] = useState(null), [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null), [profile, setProfile] = useState(null);
  const form = useRef(null), timer = useRef(null), alive = useRef(true), lock = useRef(false);
  const listId = useId();
  useEffect(() => { alive.current = true; useChat.getState().refreshMembers(conv.id); useFriends.getState().load(); return () => { alive.current = false; clearTimeout(timer.current); }; }, [conv.id]);
  const parentId = metaFor(conv.id).parentId;
  const parentMembers = useChat((s) => s.members[String(parentId)]) ?? [];
  const invitePool = parentId ? parentMembers.map(m=>({userId:m.id,username:m.username})) : friends;
  const candidates = invitePool.filter((f) => !members?.some((m) => String(m.id) === String(f.userId)) && String(f.userId) !== String(myId) && f.username.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))).slice(0, 5);
  const active = Math.min(index, Math.max(0, candidates.length - 1));
  function choose(f) { setSelected(f); setQuery(f.username); setDropdown(false); }
  async function add() {
    if (!selected || lock.current || members?.some((m) => String(m.id) === String(selected.userId))) return;
    lock.current = true; setError(null);
    const target = selected, desired = admin ? role : 'MEMBER';
    setPending({ id: target.userId, username: target.username, role: 'MEMBER', state: 'pending' }); setDropdown(false);
    let added = false, actualRole = 'MEMBER';
    try {
      await api(`/conversation-member?conversationId=${conv.id}`, { method: 'POST', body: { userId: target.userId } }); added = true;
      if (desired === 'ADMIN') { await api(`/conversation-member/${target.userId}?conversationId=${conv.id}`, { method: 'PATCH', body: { role: desired } }); actualRole = desired; }
    } catch (e) { if (alive.current) setError(added ? `Đã thêm ${target.username}, nhưng chưa đổi được quyền: ${e.message}` : e.message); }
    finally {
      await useChat.getState().refreshMembers(conv.id);
      if (alive.current) {
        setPending(added ? { id: target.userId, username: target.username, role: actualRole, state: 'joined' } : null);
        if (added) { setSelected(null); setQuery(''); timer.current = setTimeout(() => setPending(null), 1500); }
      }
      lock.current = false;
    }
  }
  async function change(m) {
    if (lock.current) return;
    lock.current = true; setBusy(m.id); setError(null);
    try { await useChat.getState().changeRole(conv.id, m.id, m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'); }
    catch (e) { if (alive.current) setError(e.message); }
    finally { lock.current = false; if (alive.current) setBusy(null); }
  }
  const rows = pending ? [pending, ...(members ?? []).filter((m) => String(m.id) !== String(pending.id))] : members ?? [];
  return <aside className="ux-members" aria-label="Quản lý thành viên nhóm">
    <header className="ux-members-header"><strong>Thành viên</strong><span className="tnum">{members?.length ?? conv.membersCount ?? 0}</span></header>
    <div ref={form} className="ux-invite" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropdown(false); }}>
      <input role="combobox" aria-label="Chọn bạn bè để thêm" aria-expanded={dropdown} aria-controls={listId} aria-activedescendant={dropdown && candidates.length ? `${listId}-${active}` : undefined} placeholder="Tìm bạn bè…" value={query} disabled={pending?.state === 'pending'} onFocus={() => setDropdown(true)} onChange={(e) => { setQuery(e.target.value); setSelected(null); setIndex(0); setDropdown(true); }} onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Escape') setDropdown(false);
        if (dropdown && candidates.length && ['ArrowDown','ArrowUp','Enter'].includes(e.key)) { e.preventDefault(); if (e.key === 'Enter') choose(candidates[active]); else setIndex((active + (e.key === 'ArrowDown' ? 1 : candidates.length - 1)) % candidates.length); }
      }} />
      <button className="ux-role" disabled={!admin || pending?.state === 'pending'} aria-label="Vai trò khi thêm" onClick={() => setRole((r) => r === 'ADMIN' ? 'MEMBER' : 'ADMIN')}>{admin && role === 'ADMIN' ? 'Quản trị' : 'Thành viên'}</button>
      <button className="ux-invite-add" disabled={!selected || !!pending || !!busy} onClick={add}>Thêm</button>
      {dropdown && <div id={listId} role="listbox" className="ux-invite-options">{candidates.map((f, i) => <button key={f.userId} role="option" id={`${listId}-${i}`} aria-selected={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(f)}>{f.username}</button>)}{!candidates.length && <p>{friendStatus === 'loading' ? 'Đang tải bạn bè…' : friendError || 'Không có bạn bè phù hợp.'}</p>}</div>}
    </div>
    {error && <p role="alert" className="ux-member-error">{error}</p>}
    <ul className="ux-member-list">{rows.map((m) => <MemberRow conv={conv} key={m.id} member={m} pending={pending?.id === m.id ? pending.state : null} admin={admin} myId={myId} busy={busy === m.id} onRole={() => change(m)} onTransfer={() => setConfirm({ kind: "transfer", member: m })} onRemove={() => setConfirm({ kind: 'remove', member: m })} onProfile={() => setProfile(m)} />)}</ul>
    <footer className="p-3"><button className="ux-group-exit" onClick={() => setConfirm({ kind: admin ? 'delete' : 'leave' })}>{admin ? 'Xóa cuộc trò chuyện' : 'Rời khỏi cuộc trò chuyện'}</button></footer>
    <ProfileCard open={!!profile} onClose={() => setProfile(null)} userId={profile?.id} username={profile?.username} sourceConversationId={conv.id} />
    <ConfirmDialog open={!!confirm} title={confirm?.kind === 'transfer' ? 'Chuyển quyền Quản trị?' : confirm?.kind === 'remove' ? 'Xóa khỏi nhóm?' : confirm?.kind === 'delete' ? 'Xóa cuộc trò chuyện?' : 'Rời khỏi cuộc trò chuyện?'} description={confirm?.kind === 'transfer' ? `${confirm.member.username} sẽ trở thành Quản trị viên. Bạn sẽ trở thành Thành viên.` : confirm?.kind === 'remove' ? `${confirm.member.username} sẽ bị xóa khỏi nhóm.` : 'Thao tác sẽ thay đổi quyền truy cập cuộc trò chuyện.'} confirmLabel="Xác nhận" onClose={() => setConfirm(null)} action={async () => { const s = useChat.getState(); if (confirm.kind === 'transfer') { await s.transferAdmin(conv.id, confirm.member.id); useUi.getState().flashSuccess('Đã chuyển quyền Quản trị'); } else if (confirm.kind === 'remove') await s.removeMember(conv.id, confirm.member.id); else if (confirm.kind === 'delete') await s.remove(conv.id); else await s.leave(conv.id); }} />
  </aside>;
}

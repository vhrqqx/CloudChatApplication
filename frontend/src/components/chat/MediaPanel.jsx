import { useEffect, useMemo, useState } from 'react';
import { Link, Image } from '@phosphor-icons/react';
import MemberPanel from './MemberPanel.jsx';
import { ImageViewer, FileCard, typeInfo, imageBlob } from './MessageList.jsx';
import { api } from '../../lib/api.js';
import { useChat, attachmentNameOf, attachmentOfMessage } from '../../store/chat.js';
import { useUi } from '../../store/ui.js';

function Thumbnail({ attachment, name, onOpen }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    if (attachment?.id) imageBlob(attachment.id).then((url) => {
      if (alive) setSrc(url);
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [attachment?.id]);
  return <button onClick={onOpen} disabled={!attachment?.downloadUrl || error} aria-label={`Xem ảnh ${name}`} title={name}>
    {src ? <img src={src} alt={name} /> : <span className="flex flex-col items-center gap-1"><Image size={16} />{error ? 'Lỗi tải ảnh' : attachment?.downloadUrl ? 'Đang tải…' : name}</span>}
  </button>;
}
export default function MediaPanel({ conv }) {
  const [tab, setTab] = useState('members');
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('');
  const [viewer, setViewer] = useState(null);
  const live = useChat((s) => s.messages[String(conv.id)]);
  useEffect(() => {
    if (tab === 'members') return;
    const controller = new AbortController();
    async function load() {
      setStatus('loading'); setError(null);
      try {
        const found = new Map();
        for (let page = 0; ; page++) {
          const result = await api(`/message?conversationId=${conv.id}&page=${page}&size=50`, { signal: controller.signal });
          if (controller.signal.aborted) return;
          const rows = result?.content ?? [];
          rows.forEach((m) => found.set(m.id, m));
          setHistory([...found.values()]);
          if (result?.last || rows.length < 50) break;
        }
        setStatus('ready');
      } catch (e) { if (!controller.signal.aborted) { setError(e.message); setStatus('error'); } }
    }
    load();
    return () => controller.abort();
  }, [conv.id, tab === 'members', retry]);
  const entries = useMemo(() => {
    const all = new Map(history.map((m) => [m.id, m]));
    for (const m of live?.list ?? []) all.set(m.id, { ...all.get(m.id), ...m });
    return [...all.values()].filter((m) => !m.deletedInfo).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).flatMap((m) => {
      const attachment = attachmentOfMessage(conv.id, m);
      const name = attachment?.filename ?? attachmentNameOf(m.content);
      if (name) return [{ key: String(m.id), name, date: m.createdAt, attachment, image: typeInfo(name, attachment?.contentType).image }];
      return (m.content?.match(/https?:\/\/[^\s<>]+/g) ?? []).map((url, i) => ({ key: `${m.id}-${i}`, name: url, url, date: m.createdAt }));
    });
  }, [history, live, conv.id]);
  const shown = entries.filter((e) => tab === 'images' ? e.image : !e.image && e.name.toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi')));
  return <aside className="m9-panel" aria-label="Thông tin và tệp hội thoại">
    <div role="tablist" aria-label="Nội dung hội thoại" className="m9-tabs">
      {[['members', conv.type === 'GROUP' ? 'Thành viên' : 'Thông tin'], ['images', 'Ảnh'], ['files', 'Tệp']].map(([id, title], index, tabs) => <button key={id} role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={(e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (index + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
        setTab(tabs[next][0]); e.currentTarget.parentElement.children[next].focus();
      }}>{title}</button>)}
    </div>
    {tab === 'members' ? <MemberPanel conv={conv} onMedia={setTab} /> : <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-3">
      {tab === 'files' && <input className="m9-filter" aria-label="Lọc tệp và liên kết" placeholder="Tìm tên tệp hoặc liên kết…" value={filter} onChange={(e) => setFilter(e.target.value)} />}
      {status === 'loading' && <p role="status">Đang duyệt lịch sử…</p>}
      {error && <p role="alert">{error} <button onClick={() => setRetry((n) => n + 1)}>Thử lại</button></p>}
      {status === 'ready' && !shown.length && <p>Không có {tab === 'images' ? 'ảnh' : 'tệp hoặc liên kết'} phù hợp.</p>}
      {shown.some((e) => !e.url && !e.attachment?.downloadUrl) && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Một số tệp chỉ có tên: API chưa cung cấp đường dẫn để xem hoặc tải.</p>}
      {tab === 'images' ? <div className="m9-grid">{shown.map((e) => <Thumbnail key={e.key} name={e.name} attachment={e.attachment} onOpen={() => e.attachment && setViewer(e.attachment)} />)}</div> : shown.map((e) => <div className="m9-file" key={e.key}>
        {e.url ? <><Link size={16} className="shrink-0" /><div className="min-w-0 flex-1"><a className="block truncate" href={e.url} target="_blank" rel="noopener noreferrer" title={e.name}>{e.name}</a><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(e.date).toLocaleDateString('vi-VN')}</span></div></> : <div className="min-w-0 flex-1"><FileCard attachment={e.attachment ?? { filename: e.name, contentType: null, size: null }} downloadable={Boolean(e.attachment?.downloadUrl)} onErrorFlash={(message) => useUi.getState().flashError(message)} /><span className="block" style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 46 }}>{new Date(e.date).toLocaleDateString('vi-VN')}</span></div>}
      </div>)}
    </div>}
    {viewer && <ImageViewer attachment={viewer} onClose={() => setViewer(null)} />}
  </aside>;
}

import { useEffect, useRef, useState } from 'react';
import { stickerPacks } from '../../data/stickers.js';

const fold = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
export default function StickerPicker({ onPick, onClose }) {
  const [packId, setPackId] = useState(stickerPacks[0].id);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const dismiss = (e) => { if (!ref.current?.contains(e.target) && !e.target.closest('[data-sticker-toggle]')) onClose(); };
    document.addEventListener('pointerdown', dismiss);
    ref.current?.querySelector('input')?.focus();
    return () => { document.removeEventListener('pointerdown', dismiss); };
  }, [onClose]);
  const packs = query.trim() ? stickerPacks : stickerPacks.filter((p) => p.id === packId);
  const results = packs.flatMap((p) => p.stickers.map((s) => ({ ...s, packId: p.id }))).filter((s) => fold(s.name).includes(fold(query.trim())));
  return <section ref={ref} role="dialog" aria-label="Chọn nhãn dán" className="sticker-picker" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
    <div className="p-2"><input className="m9-filter" style={{ marginBottom: 0 }} aria-label="Tìm nhãn dán" placeholder="Tìm nhãn dán: khóc, ngủ, tim…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <div className="sticker-tabs" role="tablist" aria-label="Bộ nhãn dán">{stickerPacks.map((p) => <button key={p.id} type="button" role="tab" aria-selected={!query && p.id === packId} title={p.name} aria-label={p.name} onClick={() => { setPackId(p.id); setQuery(''); }}><img src={p.stickers[0].src} alt="" width={36} height={36} /></button>)}</div>
    <div className="sticker-grid" aria-live="polite">{results.map((s) => <button key={`${s.packId}/${s.id}`} type="button" title={s.name} aria-label={`Gửi nhãn dán ${s.name}`} onClick={() => onPick(`[Sticker:${s.packId}/${s.id}]`)}><img src={s.src} alt={s.name} width={72} height={72} loading="lazy" /></button>)}{!results.length && <p className="col-span-4">Không có nhãn dán phù hợp.</p>}</div>
  </section>;
}

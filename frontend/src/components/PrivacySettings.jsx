import { useEffect, useState } from 'react';
import { useAccountPolicies } from '../store/accountPolicies.js';
import { api } from '../lib/api.js';
export default function PrivacySettings() {
  const items = useAccountPolicies((s) => s.items);
  const [names, setNames] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => { useAccountPolicies.getState().load().catch((e) => setError(e.message)); }, []);
  useEffect(() => { let alive = true; Promise.all(items.filter((p) => p.blocked || p.hidden).map(async (p) => [p.targetId, (await api(`/user/${p.targetId}`)).username])).then((pairs) => { if (alive) setNames(Object.fromEntries(pairs)); }).catch(() => {}); return () => { alive = false; }; }, [items]);
  async function restore(p, field) { setBusy(`${p.targetId}:${field}`); setError(null); try { await useAccountPolicies.getState().update(p.targetId, { [field]: false }); } catch (e) { setError(e.message); } finally { setBusy(null); } }
  return <details className="direct-info-section"><summary>Tài khoản đã chặn / ẩn</summary><div className="p-3" style={{ fontSize:12 }}>
    {error && <p role="alert" style={{ color:'var(--destructive)' }}>{error}</p>}
    {!items.some((p) => p.blocked || p.hidden) && <p>Chưa có tài khoản bị chặn hoặc ẩn.</p>}
    {items.filter((p) => p.blocked || p.hidden).map((p) => <div className="flex items-center gap-2 border-b py-2" style={{ borderColor:'var(--border)' }} key={p.targetId}><span className="min-w-0 flex-1 truncate">{names[p.targetId] ?? `Tài khoản #${p.targetId}`}</span>{p.blocked && <button disabled={!!busy} onClick={() => restore(p,'blocked')}>Gỡ chặn</button>}{p.hidden && <button disabled={!!busy} onClick={() => restore(p,'hidden')}>Bỏ ẩn</button>}</div>)}
  </div></details>;
}

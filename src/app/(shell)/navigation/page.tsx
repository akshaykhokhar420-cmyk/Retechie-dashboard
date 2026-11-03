'use client';
import { useState } from 'react';
import { get, put } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Alert, useLoad, Loading } from '@/components/ui';

type It = { label: string; url: string; style: string; visible: boolean; children: It[] };
const toTree = (items: any[]): It[] => { const mk = (i: any): It => ({ label: i.label, url: i.url, style: i.style ?? '', visible: !!i.is_visible, children: [] }); const top = items.filter((i) => !i.parent_id).sort((a, b) => a.position - b.position); return top.map((t) => ({ ...mk(t), children: items.filter((c) => c.parent_id === t.id).sort((a, b) => a.position - b.position).map(mk) })); };
const flat = (t: It[]) => { const out: any[] = []; for (const p of t) { const at = out.length; out.push({ label: p.label, url: p.url, style: p.style, visible: p.visible, parentRef: null }); for (const c of p.children) out.push({ label: c.label, url: c.url, style: c.style, visible: c.visible, parentRef: at }); } return out; };
const mv = <T,>(a: T[], i: number, d: number) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return b; [b[i], b[j]] = [b[j], b[i]]; return b; };

function Row({ it, set, remove, up, down, nested }: { it: It; set: (v: It) => void; remove: () => void; up: () => void; down: () => void; nested?: boolean }) {
  return <div className="item" style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 8, marginBottom: 6, marginLeft: nested ? 28 : 0, background: '#fff' }}>
    <div className="row"><input style={{ flex: 1, minWidth: 120 }} placeholder="Label" value={it.label} onChange={(e) => set({ ...it, label: e.target.value })} aria-label="Label" /><input style={{ flex: 2, minWidth: 160 }} placeholder="/shop or https://…" value={it.url} onChange={(e) => set({ ...it, url: e.target.value })} aria-label="Link" />
      <input style={{ width: 90 }} placeholder="Style" value={it.style} onChange={(e) => set({ ...it, style: e.target.value })} aria-label="Style" title="Optional style, e.g. button" />
      <label className="row" style={{ gap: 4 }}><input type="checkbox" checked={it.visible} onChange={(e) => set({ ...it, visible: e.target.checked })} />Visible</label>
      <button className="btn sm" onClick={up}>↑</button><button className="btn sm" onClick={down}>↓</button><button className="btn sm dng" onClick={remove}>✕</button></div>
    {!nested && <div style={{ marginTop: 6 }}>{it.children.map((c, i) => <Row key={i} nested it={c} set={(v) => set({ ...it, children: it.children.map((x, j) => (j === i ? v : x)) })} remove={() => set({ ...it, children: it.children.filter((_, j) => j !== i) })} up={() => set({ ...it, children: mv(it.children, i, -1) })} down={() => set({ ...it, children: mv(it.children, i, 1) })} />)}
      <button className="btn sm" style={{ marginLeft: 28 }} onClick={() => set({ ...it, children: [...it.children, { label: '', url: '/', style: '', visible: true, children: [] }] })}>+ Sub-link</button></div>}
  </div>;
}
function Menu({ m, onSaved }: { m: any; onSaved: () => void }) {
  const toast = useToast(); const { can } = useAuth(); const [t, setT] = useState<It[]>(() => toTree(m.items)); const [dirty, setDirty] = useState(false); const ch = (v: It[]) => { setT(v); setDirty(true); };
  return <div className="card"><div className="row sp"><h2>{m.name || m.location}</h2><span className="hint">{m.location}</span></div>
    {t.map((it, i) => <Row key={i} it={it} set={(v) => ch(t.map((x, j) => (j === i ? v : x)))} remove={() => ch(t.filter((_, j) => j !== i))} up={() => ch(mv(t, i, -1))} down={() => ch(mv(t, i, 1))} />)}
    <div className="row"><button className="btn sm" onClick={() => ch([...t, { label: '', url: '/', style: '', visible: true, children: [] }])}>+ Add link</button><span className="grow" />
      {can('navigation.write') && <button className="btn pri" disabled={!dirty} onClick={async () => { try { await put('/menus/' + m.id, { items: flat(t) }); toast.ok('Menu saved and live'); setDirty(false); onSaved(); } catch (e) { toast.err(e); } }}>Save menu</button>}</div></div>;
}
export default function Navigation() {
  const l = useLoad(() => get('/menus'), []);
  if (!l.data) return <Loading error={l.error} />;
  return <><PageHead title="Menus & footer" sub="Header, mobile and footer links. Saving a menu publishes it straight away." />
    <Alert kind="info">Footer headings and other labels are edited under Text &amp; labels. Links can be site paths (/shop), https:// URLs, mailto: or tel:.</Alert>
    {l.data.map((m: any) => <Menu key={m.id + ':' + m.items.length} m={m} onSaved={l.reload} />)}</>;
}

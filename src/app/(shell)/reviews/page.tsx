'use client';
import { useEffect, useState } from 'react';
import { get, patch, put, post, del, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Tabs, Alert, Status, Badge, Field, Modal, useLoad, Loading } from '@/components/ui';

export default function Reviews() {
  const [src, setSrc] = useState<'web' | 'google'>('web');
  return <><PageHead title="Reviews" sub="Website reviews from your customers, and your Google Business reviews." />
    <div className="ptabs"><button className={src === 'web' ? 'on' : ''} onClick={() => setSrc('web')}>Website reviews</button><button className={src === 'google' ? 'on' : ''} onClick={() => setSrc('google')}>Google reviews</button></div>
    {src === 'web' ? <Website /> : <Google />}</>;
}

function Website() {
  const toast = useToast(); const [s, setS] = useState('pending'); const l = useLoad(() => get('/reviews?status=' + s), [s]);
  const set = async (id: number, status: string) => { try { await patch('/reviews/' + id, { status }); l.reload(); } catch (e) { toast.err(e); } };
  return <><p className="hint" style={{ marginTop: 0 }}>Only reviews you approve appear on product pages.</p><Tabs tabs={[['pending', 'Pending'], ['published', 'Published'], ['rejected', 'Rejected']]} value={s as any} onChange={setS} />
    {!l.data ? <Loading error={l.error} /> : !l.data.length ? <Alert kind="info">No {s} reviews.</Alert> : l.data.map((r: any) => <div className="card" key={r.id}><div className="row sp"><b>{r.product}</b><Status s={r.status} /></div><div>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {r.author_name} {r.city && `· ${r.city}`} <span className="hint">{when(r.created_at)}</span></div><p>{r.body}</p>
      <div className="row">{r.status !== 'published' && <button className="btn sm pri" onClick={() => set(r.id, 'published')}>Approve</button>}{r.status !== 'rejected' && <button className="btn sm dng" onClick={() => set(r.id, 'rejected')}>Reject</button>}</div></div>)}</>;
}

function Google() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/greviews'), []);
  const [f, setF] = useState<any>(null); const [busy, setBusy] = useState(false); const [add, setAdd] = useState(false);
  useEffect(() => { if (l.data && !f) setF({ placeId: l.data.config.placeId, apiKey: l.data.config.apiKey, autoSync: l.data.config.autoSync }); }, [l.data]);
  if (!l.data || !f) return <Loading error={l.error} />;
  const c = l.data.config; const w = can('products.write'); const sw = can('settings.write');
  const save = async () => { try { await put('/greviews/config', f); toast.ok('Saved'); l.reload(); } catch (e) { toast.err(e); } };
  const sync = async () => { setBusy(true); try { await put('/greviews/config', f); const r = await post('/greviews/sync'); toast.ok(r.added ? `${r.added} new review${r.added > 1 ? 's' : ''} added` : 'Up to date — no new reviews'); l.reload(); } catch (e) { toast.err(e); l.reload(); } setBusy(false); };
  const toggle = async (r: any) => { try { await patch('/greviews/' + r.id, { visible: !r.is_visible }); l.reload(); } catch (e) { toast.err(e); } };
  const remove = async (r: any) => { if (!confirm('Delete this review from your dashboard?')) return; try { await del('/greviews/' + r.id); l.reload(); } catch (e) { toast.err(e); } };
  const shown = l.data.reviews.filter((r: any) => r.is_visible).length;
  return <>
    <div className="card"><div className="row sp" style={{ marginBottom: 4 }}><h2 style={{ margin: 0 }}>Connect Google Business Profile</h2>{c.rating != null && <Badge kind="ok">★ {c.rating} on Google{c.total ? ` · ${c.total} reviews` : ''}</Badge>}</div>
      <p className="hint">Reviews you keep visible are shown in the testimonials section of your website (home page and About page).</p>
      {sw && <><div className="grid g2"><Field label="Place ID" hint="Find it at developers.google.com/maps/documentation/places/web-service/place-id (search your business name)"><input value={f.placeId} onChange={(e) => setF({ ...f, placeId: e.target.value })} placeholder="ChIJ…" /></Field>
        <Field label="Google API key" hint="Google Cloud → enable “Places API (New)” → Credentials → API key"><input type="password" autoComplete="off" value={f.apiKey} onChange={(e) => setF({ ...f, apiKey: e.target.value })} /></Field></div>
        <label className="sw"><input type="checkbox" checked={f.autoSync} onChange={(e) => setF({ ...f, autoSync: e.target.checked })} /><i /><span><b>Sync automatically every day</b><small>New reviews are picked up without you doing anything</small></span></label>
        <div className="row" style={{ marginTop: 14 }}><button className="btn" onClick={save}>Save</button><button className="btn pri" disabled={busy || !f.placeId || !f.apiKey} onClick={sync}>{busy ? 'Syncing…' : 'Sync reviews now'}</button>{c.lastSync && <span className="hint">Last synced {when(c.lastSync)}</span>}</div></>}
      {c.lastError && <div style={{ marginTop: 12 }}><Alert kind="err">Last sync failed: {c.lastError}</Alert></div>}
      <Alert kind="info">Google only gives out its 5 most relevant reviews per request, so each sync adds any new ones to your list over time. To bring in older reviews right away, copy them from Google and use “Add a review” below.</Alert></div>

    <div className="row sp" style={{ margin: '4px 0 12px' }}><h2 style={{ margin: 0 }}>Google reviews <span className="hint" style={{ fontWeight: 400 }}>· {shown} of {l.data.reviews.length} shown on website</span></h2>{w && <button className="btn" onClick={() => setAdd(true)}>+ Add a review</button>}</div>
    {!l.data.reviews.length ? <Alert kind="info">No Google reviews yet. Connect above and sync, or add one by hand.</Alert> : l.data.reviews.map((r: any) => <div className="card grv" key={r.id}>
      <div className="grv-h">{r.photo_url ? <img src={r.photo_url} alt="" referrerPolicy="no-referrer" /> : <span className="av2">{r.author.slice(0, 1).toUpperCase()}</span>}<div style={{ flex: 1, minWidth: 0 }}><b>{r.author}</b><div className="hint"><span style={{ color: '#f59e0b' }}>{'★'.repeat(r.rating)}</span>{'☆'.repeat(5 - r.rating)} · {r.published_at || r.rel_time || ''} {r.source === 'manual' && '· added by hand'}</div></div>
        {w && <label className="sw mini-sw" title="Show on website"><input type="checkbox" checked={!!r.is_visible} onChange={() => toggle(r)} /><i /><span><b>{r.is_visible ? 'Shown' : 'Hidden'}</b></span></label>}{w && <button className="btn sm dng" onClick={() => remove(r)}>✕</button>}</div>
      {r.body ? <p style={{ margin: '10px 0 0' }}>{r.body}</p> : <p className="hint" style={{ margin: '10px 0 0' }}>(rating only, no text — not shown on website)</p>}</div>)}
    {add && <AddModal onClose={() => setAdd(false)} onSaved={() => { setAdd(false); l.reload(); }} />}</>;
}

function AddModal({ onClose, onSaved }: any) {
  const toast = useToast(); const [f, setF] = useState({ author: '', rating: 5, body: '', date: new Date().toISOString().slice(0, 10) });
  const save = async () => { try { await post('/greviews', { author: f.author.trim(), rating: Number(f.rating), body: f.body.trim(), date: f.date || null }); toast.ok('Review added'); onSaved(); } catch (e) { toast.err(e); } };
  return <Modal title="Add a Google review" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={f.author.trim().length < 2 || f.body.trim().length < 5} onClick={save}>Add review</button></>}>
    <p className="hint">Copy a real review from your Google Business Profile. Please add only genuine reviews, exactly as written.</p>
    <div className="grid g2"><Field label="Reviewer name"><input autoFocus value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} /></Field><Field label="Date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field></div>
    <Field label="Stars"><div className="seg">{[5, 4, 3, 2, 1].map((n) => <button type="button" key={n} className={f.rating === n ? 'on' : ''} onClick={() => setF({ ...f, rating: n })}>{n} ★</button>)}</div></Field>
    <Field label="Review text"><textarea style={{ minHeight: 120 }} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field></Modal>;
}

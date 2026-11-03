'use client';
import { useEffect, useRef, useState } from 'react';
import { get, api, qs } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Modal, Alert, useDebounced, Pager } from './ui';

export type MediaRow = { id: number; public_url: string; alt_text: string; original_filename: string; width: number; height: number; folder: string; usage_count?: number; mime_type: string; size_bytes?: number; caption?: string };
const cache = new Map<number, MediaRow>();
export function useMedia(id?: number | null) {
  const [m, setM] = useState<MediaRow | null>(id ? cache.get(id) ?? null : null);
  useEffect(() => { if (!id) { setM(null); return; } const c = cache.get(id); if (c) { setM(c); return; } get<MediaRow>('/media/' + id).then((r) => { cache.set(id, r); setM(r); }).catch(() => setM(null)); }, [id]);
  return m;
}
export const forgetMedia = (id: number) => cache.delete(id);

export function Thumb({ id, size = 56 }: { id?: number | null; size?: number }) {
  const m = useMedia(id);
  return <div className="thumb" style={{ width: size, height: size, backgroundImage: m ? `url(${m.public_url})` : undefined }} title={m?.original_filename} />;
}

/** Upload zone → POST /admin/media (multipart). Server validates magic bytes, size and dimensions. */
export function Uploader({ folder, onDone, zone }: { folder: string; onDone: (rows: MediaRow[]) => void; zone?: boolean }) {
  const toast = useToast(); const ref = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<string[]>([]); const [alt, setAlt] = useState(''); const [over, setOver] = useState(false);
  async function send(files: FileList | null) {
    if (!files?.length) return; setBusy(true); setErrs([]);
    const fd = new FormData(); fd.set('folder', folder); fd.set('alt', alt); Array.from(files).forEach((f) => fd.append('files', f));
    try {
      const r = await api<{ results: any[] }>('POST', '/media', undefined, { form: fd });
      onDone(r.results.filter((x) => x.ok).map((x) => x.media)); setErrs(r.results.filter((x) => !x.ok).map((x) => `${x.filename}: ${x.error}`)); if (r.results.some((x) => x.ok)) toast.ok('Uploaded');
    } catch (e: any) {
      const b = e.body; const rs = b?.results; if (rs) setErrs(rs.filter((x: any) => !x.ok).map((x: any) => `${x.filename}: ${x.error}`)); else toast.err(e);
    } finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  }
  if (zone) return <div>
    <style>{`.uz{display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:18px 20px;border:2px dashed var(--line);border-radius:16px;background:var(--card);transition:.15s;margin-bottom:16px}.uz.on{border-color:var(--pri);background:var(--pri-bg)}.uz-ic{width:44px;height:44px;border-radius:12px;background:var(--pri-bg);color:var(--pri-ink);display:grid;place-items:center;font-size:20px;flex:none}.uz-t{flex:1 1 200px;min-width:0}.uz-t b{display:block}.uz-t span{font-size:12.5px;color:var(--mut)}.uz input.alt{flex:1 1 260px;min-width:0}`}</style>
    <div className={'uz' + (over ? ' on' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files); }}>
      <div className="uz-ic">⬆</div><div className="uz-t"><b>Drag &amp; drop images here</b><span>or choose files — you can upload several at once</span></div>
      <input className="alt" placeholder="Alt text for these images (optional)" value={alt} onChange={(e) => setAlt(e.target.value)} aria-label="Alt text" />
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple style={{ display: 'none' }} onChange={(e) => send(e.target.files)} />
      <button className="btn pri" disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Uploading…' : 'Choose images'}</button></div>
    {errs.map((e) => <Alert key={e} kind="err">{e}</Alert>)}
  </div>;
  return <div>
    <div className="row"><input style={{ maxWidth: 280 }} placeholder="Alt text for these images (describes the image)" value={alt} onChange={(e) => setAlt(e.target.value)} aria-label="Alt text" />
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple style={{ display: 'none' }} onChange={(e) => send(e.target.files)} />
      <button className="btn pri" disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Uploading…' : '⬆ Upload images'}</button></div>
    {errs.map((e) => <Alert key={e} kind="err">{e}</Alert>)}
  </div>;
}

export function MediaPicker({ onPick, onClose, folder = 'pages' }: { onPick: (m: MediaRow) => void; onClose: () => void; folder?: string }) {
  const [q, setQ] = useState(''); const dq = useDebounced(q); const [off, setOff] = useState(0); const [data, setData] = useState<{ total: number; rows: MediaRow[] } | null>(null); const [tick, setTick] = useState(0);
  useEffect(() => { get(`/media${qs({ q: dq, limit: 24, offset: off })}`).then((d) => { d.rows.forEach((r: MediaRow) => cache.set(r.id, r)); setData(d); }).catch(() => {}); }, [dq, off, tick]);
  return <Modal title="Choose an image" size="lg" onClose={onClose}>
    <div className="row" style={{ marginBottom: 12 }}><input className="grow" placeholder="Search by file name, alt text or caption" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} /><Uploader folder={folder} onDone={() => setTick((t) => t + 1)} /></div>
    <div className="mg">{data?.rows.map((m) => <div key={m.id} className="mi" onClick={() => { onPick(m); onClose(); }} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && (onPick(m), onClose())}><div className="im" style={{ backgroundImage: `url(${m.public_url})` }} /><div className="cap" title={m.original_filename}>{m.original_filename}</div></div>)}</div>
    {data && !data.rows.length && <p className="hint">No images yet. Upload one above.</p>}
    {data && <Pager total={data.total} limit={24} offset={off} onChange={setOff} />}
  </Modal>;
}

export function MediaField({ value, onChange, label }: { value?: number | null; onChange: (id: number | null) => void; label?: string }) {
  const [open, setOpen] = useState(false); const m = useMedia(value);
  return <div className="row" style={{ marginBottom: 12 }}>
    <Thumb id={value} size={64} />
    <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>{label}</div><div className="hint">{m ? `${m.original_filename} · ${m.width}×${m.height}` : value ? `Image #${value}` : 'No image selected'}</div>
      <div className="row" style={{ marginTop: 4 }}><button type="button" className="btn sm" onClick={() => setOpen(true)}>{value ? 'Change' : 'Choose'}</button>{value ? <button type="button" className="btn sm" onClick={() => onChange(null)}>Remove</button> : null}</div></div>
    {open && <MediaPicker onPick={(r) => onChange(r.id)} onClose={() => setOpen(false)} />}
  </div>;
}

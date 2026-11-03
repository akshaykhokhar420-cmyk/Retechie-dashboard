'use client';
import { useRef, useState } from 'react';
import { get, api, patch, del, qs, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Uploader, forgetMedia, type MediaRow } from '@/components/Media';
import ImageEditor from '@/components/ImageEditor';
import { PageHead, Modal, Field, Pager, Alert, Badge, useLoad, useDebounced, Loading, confirmBox } from '@/components/ui';

export default function MediaLibrary() {
  const { can } = useAuth(); const [q, setQ] = useState(''); const dq = useDebounced(q); const [folder, setFolder] = useState(''); const [off, setOff] = useState(0); const [sel, setSel] = useState<number | null>(null);
  const stats = useLoad(() => get('/media/stats'), []); const l = useLoad(() => get<{ total: number; rows: MediaRow[] }>('/media' + qs({ q: dq, folder, limit: 30, offset: off })), [dq, folder, off]);
  return <>
    <PageHead title="Media library" sub={stats.data ? `Max ${stats.data.maxUploadMb} MB per file, up to ${stats.data.maxDimension}px. JPEG, PNG, WebP, GIF or AVIF — checked by file content, not by name.` : ''}>{can('media.delete') && <a className="btn sm" href="/seo-analysis#unused">Find unused files</a>}</PageHead>
    {can('media.write') && <Uploader zone folder={folder || 'pages'} onDone={() => { l.reload(); stats.reload(); }} />}
    <div className="row" style={{ marginBottom: 12 }}><input className="grow" placeholder="Search file name, alt text or caption" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} />
      <select style={{ width: 160 }} value={folder} onChange={(e) => { setFolder(e.target.value); setOff(0); }}><option value="">All folders</option>{stats.data?.folders?.map((f: string) => <option key={f}>{f}</option>)}</select></div>
    {!l.data ? <Loading error={l.error} /> : <>
      <div className="mg">{l.data.rows.map((m) => <div key={m.id} className="mi" tabIndex={0} onClick={() => setSel(m.id)} onKeyDown={(e) => e.key === 'Enter' && setSel(m.id)}><div className="im" style={{ backgroundImage: `url(${m.public_url})` }} /><div className="cap" title={m.original_filename}>{m.original_filename}</div><div className="cap hint">{m.usage_count ? `Used ${m.usage_count}×` : 'Unused'}{!m.alt_text && ' · no alt'}</div></div>)}</div>
      {!l.data.rows.length && <p className="hint">Nothing here yet.</p>}<Pager total={l.data.total} limit={30} offset={off} onChange={setOff} /></>}
    {sel && <Detail id={sel} onClose={() => setSel(null)} onChanged={() => { l.reload(); stats.reload(); }} />}
  </>;
}
function Detail({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const { can } = useAuth(); const toast = useToast(); const d = useLoad(() => get(`/media/${id}`), [id]); const [f, setF] = useState<any>(null); const [editing, setEditing] = useState(false); const file = useRef<HTMLInputElement>(null);
  if (!d.data) return <Modal title="Image" onClose={onClose}><Loading error={d.error} /></Modal>;
  const m = d.data; const v = f ?? { alt_text: m.alt_text ?? '', caption: m.caption ?? '' }; const used = m.usages?.length > 0;
  async function replace(files: FileList | File[] | null) { if (!files?.[0]) return; const fd = new FormData(); fd.set('file', files[0]); try { await api('PUT', `/media/${id}/file`, undefined, { form: fd }); forgetMedia(id); toast.ok('Image replaced everywhere it is used'); d.reload(); onChanged(); } catch (e) { toast.err(e); } }
  if (editing) return <Modal title={'Edit · ' + m.original_filename} onClose={() => setEditing(false)} size="lg"><ImageEditor src={m.public_url} name={m.original_filename} mime={m.mime_type} onCancel={() => setEditing(false)} onSave={async (file) => { await replace([file]); setEditing(false); }} /></Modal>;
  const kb = Math.round((m.size_bytes ?? 0) / 1024);
  return <Modal title="Image details" onClose={onClose} size="lg">
    <style>{`.md{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}.md-prev{background:repeating-conic-gradient(var(--line2) 0 25%,var(--card) 0 50%) 0 0/16px 16px;border:1px solid var(--line);border-radius:14px;display:flex;align-items:center;justify-content:center;padding:14px;min-height:260px}.md-prev img{max-width:100%;max-height:340px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.18)}.md-meta{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 8px}.md-meta span{font-size:12px;padding:3px 10px;border-radius:99px;background:var(--line2);color:var(--ink2)}.md-url{display:block;font-size:11.5px;color:var(--mut);word-break:break-all;background:var(--line2);padding:8px 10px;border-radius:8px}.md-name{font-weight:650;font-size:15px;word-break:break-all;margin:0 0 12px}.md-form input{width:100%}.md-used{display:grid;gap:6px;margin:6px 0 4px}.md-used div{display:flex;gap:8px;align-items:flex-start;font-size:13px}.md-act{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}.md-act .sp{flex:1}@media(max-width:760px){.md{grid-template-columns:1fr}}`}</style>
    <div className="md">
      <div><div className="md-prev"><img src={m.public_url} alt={m.alt_text ?? ''} /></div>
        <div className="md-meta"><span>{m.width}×{m.height}px</span><span>{m.mime_type}</span><span>{kb} KB</span><span>{when(m.created_at)}</span></div><code className="md-url">{m.public_url}</code></div>
      <div className="md-form"><p className="md-name">{m.original_filename}</p>
        {!m.alt_text && <Alert kind="warn">Add alt text — it helps accessibility and SEO.</Alert>}
        <Field label="Alt text"><input value={v.alt_text} onChange={(e) => setF({ ...v, alt_text: e.target.value })} placeholder="Describe the image" /></Field>
        <Field label="Caption"><input value={v.caption} onChange={(e) => setF({ ...v, caption: e.target.value })} placeholder="Optional caption" /></Field>
        <h3 style={{ marginTop: 14 }}>Used in {used && <span className="hint">({m.usages.length})</span>}</h3>
        {used ? <div className="md-used">{m.usages.map((u: any, i: number) => <div key={i}><Badge>{u.type}</Badge><span>{u.name}</span></div>)}</div> : <p className="hint" style={{ margin: 0 }}>Not used anywhere.</p>}
        <input ref={file} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => replace(e.target.files)} />
        <div className="md-act">
          {can('media.write') && <><button className="btn pri" disabled={!f} onClick={async () => { try { await patch('/media/' + id, f); toast.ok('Saved'); forgetMedia(id); setF(null); d.reload(); onChanged(); } catch (e) { toast.err(e); } }}>Save</button>
            <button className="btn" onClick={() => setEditing(true)}>✎ Edit image</button><button className="btn" onClick={() => file.current?.click()}>⇪ Replace file</button></>}
          <span className="sp" />
          {can('media.delete') && <button className="btn dng" disabled={used} title={used ? 'Remove it from the places above first' : ''} onClick={async () => { if (!confirmBox('Delete this image permanently?')) return; try { await del('/media/' + id); toast.ok('Deleted'); onClose(); onChanged(); } catch (e) { toast.err(e); } }}>Delete</button>}</div>
        {used && <p className="hint">In-use images can't be deleted — replace or edit the file to change it everywhere at once.</p>}</div></div>
  </Modal>;
}

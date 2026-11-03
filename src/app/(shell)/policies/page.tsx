'use client';
import { useState } from 'react';
import { get, put, post, openPreview } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Status, Badge, Modal, Field, Alert, useLoad, Loading } from '@/components/ui';

export default function Policies() {
  const l = useLoad(() => get('/policies'), []); const [open, setOpen] = useState<number | null>(null);
  if (!l.data) return <Loading error={l.error} />;
  return <><PageHead title="Policies" sub="Shipping, returns, warranty, privacy, terms and more. Written here, shown at /policy/<name>." />
    <div className="card tw"><table><thead><tr><th>Policy</th><th>Status</th><th>Draft</th><th /></tr></thead><tbody>{l.data.map((p: any) => <tr key={p.id}><td><b>{p.title}</b><div className="hint">{p.subtitle}</div></td><td><Status s={p.status} /></td><td>{p.has_draft ? <Badge kind="warn">unpublished edits</Badge> : '—'}</td><td><button className="btn sm" onClick={() => setOpen(p.id)}>Edit</button></td></tr>)}</tbody></table></div>
    {open && <Edit id={open} onClose={() => setOpen(null)} onSaved={l.reload} />}</>;
}
function Edit({ id, onClose, onSaved }: { id: number; onClose: () => void; onSaved: () => void }) {
  const { can } = useAuth(); const toast = useToast(); const d = useLoad(() => get(`/policies/${id}`), [id]); const [f, setF] = useState<any>(null);
  if (!d.data) return <Modal title="Policy" onClose={onClose}><Loading error={d.error} /></Modal>;
  const p = d.data; const v = f ?? { title: p.title, subtitle: p.subtitle ?? '', body: p.draft_body ?? p.published_body ?? '' };
  const save = async () => { await put('/policies/' + id, v); };
  return <Modal title={`Edit — ${p.title}`} size="xl" onClose={onClose}>
    <Alert kind="info">Body is HTML. Allowed tags: h2, h3, p, ul, ol, li, a, b, strong, i, em, br, table. Save a draft, preview it, then publish.</Alert>
    <div className="grid g2"><Field label="Title"><input value={v.title} onChange={(e) => setF({ ...v, title: e.target.value })} /></Field><Field label="Subtitle"><input value={v.subtitle} onChange={(e) => setF({ ...v, subtitle: e.target.value })} /></Field></div>
    <Field label="Body (HTML)"><textarea style={{ minHeight: 360, fontFamily: 'monospace', fontSize: 13 }} value={v.body} onChange={(e) => setF({ ...v, body: e.target.value })} /></Field>
    <div className="row">{can('content.write') && <button className="btn pri" onClick={async () => { try { await save(); toast.ok('Draft saved'); setF(null); d.reload(); onSaved(); } catch (e) { toast.err(e); } }}>Save draft</button>}
      <button className="btn" onClick={() => openPreview('/policy/' + p.slug).catch(toast.err)}>Preview draft ↗</button>
      {can('content.publish') && <button className="btn" onClick={async () => { try { if (f) await save(); await post(`/policies/${id}/publish`); toast.ok('Published'); setF(null); d.reload(); onSaved(); } catch (e) { toast.err(e); } }}>Publish</button>}</div>
  </Modal>;
}

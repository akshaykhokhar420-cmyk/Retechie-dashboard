'use client';
import { askConfirm } from '@/components/Confirm';
import { useState } from 'react';
import { get, post, put, del } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Badge, Modal, Field, useLoad, Loading } from '@/components/ui';

const SCOPES = ['home', 'product', 'support', 'general'];
export default function Faqs() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/faqs'), []); const [ed, setEd] = useState<any>(null); const [scope, setScope] = useState('');
  if (!l.data) return <Loading error={l.error} />;
  const rows = l.data.filter((r: any) => !scope || r.scope === scope);
  return <><PageHead title="FAQs" sub="Shown on the home, product and support pages. FAQ structured data is only emitted for FAQs that are actually visible on the page.">
    <select style={{ width: 150 }} value={scope} onChange={(e) => setScope(e.target.value)}><option value="">All scopes</option>{SCOPES.map((s) => <option key={s}>{s}</option>)}</select>{can('content.write') && <button className="btn pri" onClick={() => setEd({ scope: scope || 'home', question: '', answer: '', position: rows.length + 1, isVisible: true })}>+ New FAQ</button>}</PageHead>
    <div className="card tw"><table><thead><tr><th>Scope</th><th>Question</th><th>Order</th><th>Visible</th><th /></tr></thead><tbody>{rows.map((r: any) => <tr key={r.id}><td><Badge>{r.scope}</Badge></td><td>{r.question}</td><td>{r.position}</td><td>{r.is_visible ? 'Yes' : <Badge kind="warn">Hidden</Badge>}</td>
      <td className="row"><button className="btn sm" onClick={() => setEd({ id: r.id, scope: r.scope, question: r.question, answer: r.answer, position: r.position, isVisible: !!r.is_visible })}>Edit</button>{can('content.write') && <button className="btn sm dng" onClick={async () => { if (!await askConfirm('Delete this FAQ?')) return; try { await del('/faqs/' + r.id); l.reload(); } catch (e) { toast.err(e); } }}>Delete</button>}</td></tr>)}</tbody></table></div>
    {ed && <Modal title={ed.id ? 'Edit FAQ' : 'New FAQ'} onClose={() => setEd(null)} footer={<><button className="btn" onClick={() => setEd(null)}>Cancel</button><button className="btn pri" onClick={async () => { const { id, ...b } = ed; try { id ? await put('/faqs/' + id, b) : await post('/faqs', b); toast.ok('Saved'); setEd(null); l.reload(); } catch (e) { toast.err(e); } }}>Save</button></>}>
      <div className="grid g2"><Field label="Scope"><select value={ed.scope} onChange={(e) => setEd({ ...ed, scope: e.target.value })}>{SCOPES.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Order"><input type="number" value={ed.position} onChange={(e) => setEd({ ...ed, position: Number(e.target.value) })} /></Field></div>
      <Field label="Question"><input value={ed.question} onChange={(e) => setEd({ ...ed, question: e.target.value })} /></Field><Field label="Answer"><textarea value={ed.answer} onChange={(e) => setEd({ ...ed, answer: e.target.value })} /></Field>
      <label className="row"><input type="checkbox" checked={ed.isVisible} onChange={(e) => setEd({ ...ed, isVisible: e.target.checked })} /> Visible on the site</label></Modal>}</>;
}

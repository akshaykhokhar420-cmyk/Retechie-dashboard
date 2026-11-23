'use client';
import { useState } from 'react';
import { get, patch, post, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Tabs, Status, Alert, Field, Modal, useLoad, Loading } from '@/components/ui';

export default function Support() {
  const { can } = useAuth(); const toast = useToast(); const [tab, setTab] = useState<'req' | 'news'>('req'); const [st, setSt] = useState('open'); const [rep, setRep] = useState<any>(null); const [sending, setSending] = useState(false);
  const r = useLoad(() => get('/support-requests?status=' + st), [st]); const n = useLoad(() => get('/newsletter'), []);
  return <><PageHead title="Support & newsletter" /><Tabs tabs={[['req', 'Support requests'], ['news', 'Newsletter subscribers']]} value={tab} onChange={setTab} />
    {tab === 'req' ? <><div className="row" style={{ marginBottom: 10 }}>{['open', 'in_progress', 'closed'].map((s) => <button key={s} className={'btn sm ' + (st === s ? 'pri' : '')} onClick={() => setSt(s)}>{s.replace('_', ' ')}</button>)}</div>
      {!r.data ? <Loading error={r.error} /> : !r.data.rows.length ? <Alert kind="info">Nothing {st.replace('_', ' ')}.</Alert> : r.data.rows.map((x: any) => <div className="card" key={x.id}><div className="row sp"><b>{x.topic}</b><Status s={x.status} /></div><div>{x.name} · {x.contact} <span className="hint">{when(x.created_at)}</span></div><p style={{ whiteSpace: 'pre-wrap' }}>{x.message}</p>
        {(x.replies ?? []).map((p: any) => <div key={p.id} style={{ margin: '8px 0', padding: '10px 12px', borderLeft: '3px solid #2f9e4a', background: 'rgba(47,158,74,.08)', borderRadius: 8 }}><div className="hint">{p.author || 'Team'} · {p.channel === 'email' ? 'emailed to ' + p.sent_to : p.channel === 'whatsapp' ? 'WhatsApp ' + p.sent_to : 'call note'} · {when(p.created_at)}</div><div style={{ whiteSpace: 'pre-wrap' }}>{p.body}</div></div>)}
        {can('customers.write') && <div className="row" style={{ marginBottom: 6 }}><button className="btn pri sm" onClick={() => setRep({ x, via: /@/.test(x.contact) ? 'email' : 'whatsapp', text: '' })}>Reply</button></div>}
        {can('customers.write') && <div className="row">{['open', 'in_progress', 'closed'].filter((s) => s !== x.status).map((s) => <button key={s} className="btn sm" onClick={async () => { try { await patch('/support-requests/' + x.id, { status: s }); r.reload(); } catch (e) { toast.err(e); } }}>Mark {s.replace('_', ' ')}</button>)}</div>}</div>)}</>
      : !n.data ? <Loading error={n.error} /> : <div className="card tw"><div className="hint">{n.data.length} subscriber(s), latest 500</div><table><thead><tr><th>Email</th><th>Subscribed</th></tr></thead><tbody>{n.data.map((x: any) => <tr key={x.id}><td>{x.email}</td><td>{when(x.created_at)}</td></tr>)}</tbody></table></div>}
    {rep && <Modal title={'Reply to ' + rep.x.name} onClose={() => setRep(null)} footer={<><button className="btn" onClick={() => setRep(null)}>Cancel</button><button className="btn pri" disabled={sending || rep.text.trim().length < 2} onClick={async () => {
      const num = String(rep.x.contact).replace(/\D/g, '').replace(/^0+/, ''); const wa = num.length === 10 ? '91' + num : num;
      setSending(true); const w = rep.via === 'whatsapp' && wa ? window.open('', '_blank') : null; try { await post('/support-requests/' + rep.x.id + '/reply', { message: rep.text.trim(), via: rep.via }); if (w) w.location.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(rep.text.trim()); toast.ok(rep.via === 'email' ? 'Reply emailed to the customer' : 'Reply saved'); setRep(null); r.reload(); } catch (e) { w?.close(); toast.err(e); } finally { setSending(false); }
    }}>{rep.via === 'email' ? 'Send email' : rep.via === 'whatsapp' ? 'Save & open WhatsApp' : 'Save note'}</button></>}>
      <div className="hint" style={{ marginBottom: 8 }}>{rep.x.topic} · {rep.x.contact}</div>
      <Field label="Send via"><select value={rep.via} onChange={(e) => setRep({ ...rep, via: e.target.value })}>{/@/.test(rep.x.contact) && <option value="email">Email</option>}<option value="whatsapp">WhatsApp (opens WhatsApp with your message)</option><option value="call">Phone call (just save a note)</option></select></Field>
      <Field label="Your reply"><textarea rows={7} value={rep.text} onChange={(e) => setRep({ ...rep, text: e.target.value })} placeholder="Hi, thanks for contacting Retechie…" style={{ width: '100%' }} /></Field></Modal>}
  </>;
}

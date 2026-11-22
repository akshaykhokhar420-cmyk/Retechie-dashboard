'use client';
import { useState } from 'react';
import { get, patch, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Tabs, Status, Alert, useLoad, Loading } from '@/components/ui';

export default function Support() {
  const { can } = useAuth(); const toast = useToast(); const [tab, setTab] = useState<'req' | 'news'>('req'); const [st, setSt] = useState('open');
  const r = useLoad(() => get('/support-requests?status=' + st), [st]); const n = useLoad(() => get('/newsletter'), []);
  return <><PageHead title="Support & newsletter" /><Tabs tabs={[['req', 'Support requests'], ['news', 'Newsletter subscribers']]} value={tab} onChange={setTab} />
    {tab === 'req' ? <><div className="row" style={{ marginBottom: 10 }}>{['open', 'in_progress', 'closed'].map((s) => <button key={s} className={'btn sm ' + (st === s ? 'pri' : '')} onClick={() => setSt(s)}>{s.replace('_', ' ')}</button>)}</div>
      {!r.data ? <Loading error={r.error} /> : !r.data.rows.length ? <Alert kind="info">Nothing {st.replace('_', ' ')}.</Alert> : r.data.rows.map((x: any) => { const phone = (String(x.contact).match(/\+?[\d][\d\s()-]{8,}/) ?? [''])[0].trim(); const email = (String(x.contact).match(/[^\s@·<>]+@[^\s@·<>]+\.[^\s@·<>]+/) ?? [''])[0]; const digits = phone.replace(/\D/g, ''); const wa = digits ? 'https://wa.me/' + (digits.length === 10 ? '91' + digits : digits) : '';
        return <div className="card" key={x.id}><div className="row sp"><span><b style={{ fontSize: 16 }}>{x.name}</b> <span className="hint">· {when(x.created_at)}</span></span><Status s={x.status} /></div>
        <div style={{ margin: '8px 0' }}><span className="chip">Concern: {x.topic}</span></div>
        <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0', padding: 12, background: 'rgba(0,0,0,.04)', borderRadius: 10 }}>{x.message}</p>
        <div className="row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>{phone && <a className="btn sm" href={'tel:' + digits}>📞 {phone}</a>}{wa && <a className="btn sm" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}{email && <a className="btn sm" href={'mailto:' + email}>✉ {email}</a>}{!phone && !email && <span className="hint">{x.contact}</span>}</div>
        {can('customers.write') && <div className="row">{['open', 'in_progress', 'closed'].filter((s) => s !== x.status).map((s) => <button key={s} className="btn sm" onClick={async () => { try { await patch('/support-requests/' + x.id, { status: s }); r.reload(); } catch (e) { toast.err(e); } }}>Mark {s.replace('_', ' ')}</button>)}</div>}</div>; })}</>
      : !n.data ? <Loading error={n.error} /> : <div className="card tw"><div className="hint">{n.data.length} subscriber(s), latest 500</div><table><thead><tr><th>Email</th><th>Subscribed</th></tr></thead><tbody>{n.data.map((x: any) => <tr key={x.id}><td>{x.email}</td><td>{when(x.created_at)}</td></tr>)}</tbody></table></div>}</>;
}

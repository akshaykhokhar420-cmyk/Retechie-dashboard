'use client';
import { useState } from 'react';
import { get, patch, when, rupees } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Tabs, Status, Alert, useLoad, Loading } from '@/components/ui';

export default function AfterSales() {
  const { can } = useAuth(); const toast = useToast(); const [tab, setTab] = useState<'ret' | 'war'>('ret');
  const r = useLoad(() => get('/returns'), []); const w = useLoad(() => get('/warranty-claims'), []);
  const act = async (fn: () => Promise<any>, reload: () => void) => { try { await fn(); toast.ok('Saved'); reload(); } catch (e: any) { toast.err(e); } };
  return <><PageHead title="Returns & warranty" />
    <Tabs tabs={[['ret', 'Returns & refunds'], ['war', 'Warranty claims']]} value={tab} onChange={setTab} />
    {tab === 'ret' ? (!r.data ? <Loading error={r.error} /> : !r.data.length ? <Alert kind="info">No return requests yet.</Alert> : r.data.map((x: any) => <div className="card" key={x.id}>
      <div className="row sp"><b>{x.return_no || '#' + x.id} · {x.order_number}</b><Status s={x.status} /></div>
      <div className="hint">{x.contact_name} · {x.contact_phone} · {rupees(x.grand_total)} · {x.payment_method} · {when(x.created_at)} · wants {x.resolution}</div>
      <p>{x.reason}{x.detail ? ' — ' + x.detail : ''}</p>{x.admin_note && <div className="hint">Note: {x.admin_note}</div>}
      {can('orders.write') && <div className="row">{(['approved', 'picked_up', 'rejected'] as const).filter((s) => s !== x.status).map((s) => <button key={s} className="btn sm" onClick={() => { const note = prompt('Note to customer (optional)') ?? ''; act(() => patch('/returns/' + x.id, { status: s, adminNote: note }), r.reload); }}>{s.replace('_', ' ')}</button>)}
        {x.status !== 'refunded' && <button className="btn sm pri" onClick={() => { const amt = Number(prompt('Refund amount (₹)', String(x.grand_total))); if (!amt) return; const ok = confirm('Put the item back in sellable stock? OK = yes (passed QC), Cancel = mark defective'); act(() => patch('/returns/' + x.id, { status: 'refunded', refundAmount: amt, restock: ok }), r.reload); }}>Mark refunded</button>}</div>}
    </div>)) :
    (!w.data ? <Loading error={w.error} /> : !w.data.length ? <Alert kind="info">No warranty claims yet.</Alert> : w.data.map((x: any) => <div className="card" key={x.id}>
      <div className="row sp"><b>{x.claim_no} · serial {x.serial_number || '—'}</b><Status s={x.status} /></div>
      <div className="hint">{x.contact_name} · {x.contact_phone} · {x.contact_email} · {when(x.created_at)}</div><p>{x.issue}</p>{x.admin_note && <div className="hint">Note: {x.admin_note}</div>}
      {can('orders.write') && <div className="row">{['in_review', 'approved', 'repaired', 'replaced', 'rejected'].filter((s) => s !== x.status).map((s) => <button key={s} className="btn sm" onClick={() => { const note = prompt('Note to customer (optional)') ?? ''; act(() => patch('/warranty-claims/' + x.id, { status: s, adminNote: note }), w.reload); }}>{s.replace('_', ' ')}</button>)}</div>}
    </div>))}</>;
}

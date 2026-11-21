'use client';
import { useState } from 'react';
import { get, patch, when, rupees } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Tabs, Status, Alert, Modal, Field, useLoad, Loading } from '@/components/ui';

export default function AfterSales() {
  const { can } = useAuth(); const toast = useToast(); const [tab, setTab] = useState<'ret' | 'war'>('ret');
  type Dlg = { kind: 'ret' | 'war'; x: any; status: string; refund?: boolean };
  const [dlg, setDlg] = useState<Dlg | null>(null); const [note, setNote] = useState(''); const [amt, setAmt] = useState(''); const [restock, setRestock] = useState(true);
  const open = (d: Dlg) => { setNote(''); setAmt(String(d.x.grand_total ?? '')); setRestock(true); setDlg(d); };
  const save = async () => { if (!dlg) return; const { kind, x, status, refund } = dlg; if (refund && !(Number(amt) > 0)) { toast.err(new Error('Enter the refund amount')); return; }
    const body = refund ? { status, refundAmount: Number(amt), restock, adminNote: note } : { status, adminNote: note }; setDlg(null);
    await act(() => patch((kind === 'ret' ? '/returns/' : '/warranty-claims/') + x.id, body), kind === 'ret' ? r.reload : w.reload); };
  const r = useLoad(() => get('/returns'), []); const w = useLoad(() => get('/warranty-claims'), []);
  const act = async (fn: () => Promise<any>, reload: () => void) => { try { await fn(); toast.ok('Saved'); reload(); } catch (e: any) { toast.err(e); } };
  return <><PageHead title="Returns & warranty" />
    <Tabs tabs={[['ret', 'Returns & refunds'], ['war', 'Warranty claims']]} value={tab} onChange={setTab} />
    {tab === 'ret' ? (!r.data ? <Loading error={r.error} /> : !r.data.length ? <Alert kind="info">No return requests yet.</Alert> : r.data.map((x: any) => <div className="card" key={x.id}>
      <div className="row sp"><b>{x.return_no || '#' + x.id} · {x.order_number}</b><Status s={x.status} /></div>
      <div className="hint">{x.contact_name} · {x.contact_phone} · {rupees(x.grand_total)} · {x.payment_method} · {when(x.created_at)} · wants {x.resolution}</div>
      <p>{x.reason}{x.detail ? ' — ' + x.detail : ''}</p>{x.admin_note && <div className="hint">Note: {x.admin_note}</div>}
      {can('orders.write') && <div className="row">{(['approved', 'picked_up', 'rejected'] as const).filter((s) => s !== x.status).map((s) => <button key={s} className="btn sm" onClick={() => open({ kind: 'ret', x, status: s })}>{s.replace('_', ' ')}</button>)}
        {x.status !== 'refunded' && <button className="btn sm pri" onClick={() => open({ kind: 'ret', x, status: 'refunded', refund: true })}>Mark refunded</button>}</div>}
    </div>)) :
    (!w.data ? <Loading error={w.error} /> : !w.data.length ? <Alert kind="info">No warranty claims yet.</Alert> : w.data.map((x: any) => <div className="card" key={x.id}>
      <div className="row sp"><b>{x.claim_no} · serial {x.serial_number || '—'}</b><Status s={x.status} /></div>
      <div className="hint">{x.contact_name} · {x.contact_phone} · {x.contact_email} · {when(x.created_at)}</div><p>{x.issue}</p>{x.admin_note && <div className="hint">Note: {x.admin_note}</div>}
      {can('orders.write') && <div className="row">{['in_review', 'approved', 'repaired', 'replaced', 'rejected'].filter((s) => s !== x.status).map((s) => <button key={s} className="btn sm" onClick={() => open({ kind: 'war', x, status: s })}>{s.replace('_', ' ')}</button>)}</div>}
    </div>))}
    {dlg && <Modal title={dlg.refund ? 'Mark refunded' : 'Set status: ' + dlg.status.replace('_', ' ')} onClose={() => setDlg(null)} footer={<><button className="btn" onClick={() => setDlg(null)}>Cancel</button><button className="btn pri" onClick={save}>Save</button></>}>
      {dlg.refund && <Field label="Refund amount (₹)"><input type="number" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus /></Field>}
      {dlg.refund && <Field label="Item condition" hint="Passed QC puts it back in sellable stock."><select value={restock ? '1' : '0'} onChange={(e) => setRestock(e.target.value === '1')}><option value="1">Passed QC: back in stock</option><option value="0">Failed: mark defective</option></select></Field>}
      <Field label="Note to customer (optional)"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} autoFocus={!dlg.refund} /></Field>
    </Modal>}</>;
}

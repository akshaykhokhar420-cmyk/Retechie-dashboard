'use client';
import { useState } from 'react';
import { get, patch, qs, rupees, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Status, Pager, Modal, useLoad, useDebounced, Loading, confirmBox } from '@/components/ui';

export default function Customers() {
  const { can } = useAuth(); const toast = useToast(); const [q, setQ] = useState(''); const dq = useDebounced(q); const [off, setOff] = useState(0); const [sel, setSel] = useState<number | null>(null);
  const l = useLoad(() => get('/customers' + qs({ q: dq, limit: 25, offset: off })), [dq, off]); const d = useLoad(() => (sel ? get('/customers/' + sel) : Promise.resolve(null)), [sel]);
  return <><PageHead title="Customers" />
    <input style={{ marginBottom: 12 }} placeholder="Search name, email or phone" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} />
    {!l.data ? <Loading error={l.error} /> : <><div className="card tw"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Spent</th><th>Status</th><th>Joined</th></tr></thead><tbody>{l.data.rows.map((c: any) => <tr key={c.id} className="click" onClick={() => setSel(c.id)}><td><b>{c.name}</b></td><td>{c.email}</td><td>{c.phone}</td><td>{c.orders}</td><td>{rupees(c.spent)}</td><td><Status s={c.status} /></td><td>{when(c.created_at)}</td></tr>)}</tbody></table></div><Pager total={l.data.total} limit={25} offset={off} onChange={setOff} /></>}
    {sel && d.data && <Modal title={d.data.name} onClose={() => setSel(null)} size="lg"><p>{d.data.email} · {d.data.phone} · <Status s={d.data.status} /> {d.data.marketing_opt_in ? '· accepts marketing' : ''}</p>
      <h3>Addresses</h3>{d.data.addresses.map((a: any, i: number) => <div key={i} className="hint">{a.label}: {a.line1}, {a.city}, {a.state} {a.pincode}</div>)}
      <h3 style={{ marginTop: 12 }}>Orders</h3><table><tbody>{d.data.orders.map((o: any) => <tr key={o.order_number}><td><a href={`/orders?q=${o.order_number}`}>{o.order_number}</a></td><td>{rupees(o.grand_total)}</td><td><Status s={o.status} /></td><td>{when(o.placed_at)}</td></tr>)}</tbody></table>
      {can('customers.write') && <div style={{ marginTop: 14 }}><button className={'btn ' + (d.data.status === 'active' ? 'dng' : 'pri')} onClick={async () => { if (d.data.status === 'active' && !confirmBox('Suspend this customer and sign them out?')) return; try { await patch('/customers/' + sel, { status: d.data.status === 'active' ? 'suspended' : 'active' }); d.reload(); l.reload(); } catch (e) { toast.err(e); } }}>{d.data.status === 'active' ? 'Suspend account' : 'Reactivate account'}</button></div>}</Modal>}</>;
}

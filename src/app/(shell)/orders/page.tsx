'use client';
import Link from 'next/link';
import { useState } from 'react';
import { get, qs, rupees, when } from '@/lib/api';
import Icon from '@/components/Icon';
import { PageHead, Status, Pager, useLoad, useDebounced, Loading } from '@/components/ui';

const TABS = ['', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

export default function Orders() {
  const [q, setQ] = useState(''); const dq = useDebounced(q); const [status, setStatus] = useState(''); const [pay, setPay] = useState(''); const [off, setOff] = useState(0);
  const l = useLoad(() => get('/orders' + qs({ q: dq, status, payment: pay, limit: 25, offset: off })), [dq, status, pay, off]);
  const counts = useLoad(async () => { const r = await Promise.all(TABS.map((s) => get('/orders' + qs({ status: s, limit: 1 })))); return Object.fromEntries(TABS.map((s, i) => [s, r[i].total])); }, []);
  return <><PageHead title="Orders" sub="Track every order from placed to delivered."><Link className="btn pri" href="/orders/new">Create order</Link></PageHead>
    <div className="ptabs">{TABS.map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => { setStatus(s); setOff(0); }} style={{ textTransform: 'capitalize' }}>{s || 'All'}<i>{counts.data?.[s] ?? '–'}</i></button>)}</div>
    <div className="tbar"><div className="sbox"><Icon n="search" /><input placeholder="Order number, name, email or phone…" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} /></div>
      <select value={pay} onChange={(e) => { setPay(e.target.value); setOff(0); }}><option value="">Any payment status</option>{['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'].map((s) => <option key={s}>{s}</option>)}</select></div>
    {!l.data ? <Loading error={l.error} /> : <><div className="card tw plist"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Fulfilment</th><th>Placed</th></tr></thead><tbody>{l.data.rows.map((o: any) => <tr key={o.id} className="clk"><td><Link href={`/orders/${o.id}`}><b>{o.order_number}</b></Link></td><td><div className="pc"><div><b>{o.contact_name}</b><div className="hint">{o.contact_email}</div></div></div></td><td><b>{rupees(o.grand_total)}</b></td><td><div className="hint" style={{ marginBottom: 3 }}>{o.payment_method?.toUpperCase()}</div><Status s={o.payment_status} /></td><td><Status s={o.status} /></td><td><Status s={o.fulfilment_status} /></td><td className="hint">{when(o.placed_at)}</td></tr>)}</tbody></table>
      {!l.data.rows.length && <div className="empty-row">No orders match your filters.</div>}</div><Pager total={l.data.total} limit={25} offset={off} onChange={setOff} /></>}</>;
}

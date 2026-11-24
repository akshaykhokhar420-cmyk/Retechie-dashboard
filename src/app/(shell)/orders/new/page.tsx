'use client';
import Link from 'next/link';
import { useState } from 'react';
import { get, post, qs, rupees } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Field, PageHead, useLoad, useDebounced } from '@/components/ui';

type Item = { slug: string; title: string; price: number; qty: number; warrantyMonths: number };
const STATES = ['Delhi', 'Haryana', 'Uttar Pradesh', 'Punjab', 'Rajasthan', 'Uttarakhand', 'Himachal Pradesh', 'Chandigarh', 'Jammu and Kashmir', 'Gujarat', 'Maharashtra', 'Madhya Pradesh', 'Bihar', 'West Bengal', 'Odisha', 'Jharkhand', 'Chhattisgarh', 'Karnataka', 'Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Kerala', 'Goa', 'Assam', 'Other'];
const BLANK = { name: '', phone: '', email: '', addr: '', city: '', state: 'Delhi', pin: '', gstin: '', delivery: 'standard', payment: 'cod', coupon: '', discount: '', note: '', paidNow: false, skipAdvance: true, notify: true };

export default function NewOrder() {
  const toast = useToast(); const [f, setF] = useState({ ...BLANK }); const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState(''); const dq = useDebounced(q); const [busy, setBusy] = useState(false); const [done, setDone] = useState<any>(null);
  const found = useLoad(async () => (dq.trim().length < 2 ? { rows: [] } : get('/products' + qs({ q: dq, status: 'published', limit: 8 }))), [dq]);
  const settings = useLoad(() => get('/settings'), []);
  const fees: Record<string, number> = (Array.isArray(settings.data) ? settings.data.find((x: any) => x.key === 'commerce')?.value?.warranty_fees : null) ?? {};
  const set = (k: keyof typeof BLANK) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const subtotal = items.reduce((a, i) => a + (i.price + (i.warrantyMonths ? Number(fees[String(i.warrantyMonths)] ?? 0) : 0)) * i.qty, 0);
  const off = Math.max(0, Number(f.discount) || 0); const online = f.payment !== 'cod';
  const add = (p: any) => { setItems((l) => l.some((x) => x.slug === p.slug) ? l.map((x) => x.slug === p.slug ? { ...x, qty: x.qty + 1 } : x) : [...l, { slug: p.slug, title: p.title, price: Number(p.price), qty: 1, warrantyMonths: 0 }]); setQ(''); };
  const upd = (slug: string, patch: Partial<Item>) => setItems((l) => l.map((x) => x.slug === slug ? { ...x, ...patch } : x));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!items.length) { toast.err(new Error('Add at least one product.')); return; }
    setBusy(true);
    try {
      const r = await post('/orders/manual', { name: f.name, email: f.email, phone: f.phone, addr: f.addr, city: f.city, state: f.state, pin: f.pin, gstin: f.gstin || undefined, delivery: f.delivery, payment: f.payment,
        items: items.map((i) => ({ slug: i.slug, qty: i.qty, warrantyMonths: i.warrantyMonths })), coupon: f.coupon.trim() || null, discount: off || undefined, note: f.note || undefined, paidNow: online ? f.paidNow : false, skipAdvance: f.payment === 'cod' ? f.skipAdvance : undefined, notify: f.notify });
      setDone(r); toast.ok('Order ' + r.number + ' created');
    } catch (err) { toast.err(err); } finally { setBusy(false); }
  }
  if (done) return <><PageHead title="Order created" sub="The customer has been notified by email." />
    <div className="card" style={{ padding: 22, maxWidth: 640 }}>
      <h2 style={{ margin: '0 0 6px' }}>{done.number}</h2><div className="hint">Total {rupees(done.total)} · {done.paid ? 'Payment recorded as received' : done.payUrl ? 'Waiting for the customer to pay' : 'Cash on delivery'}</div>
      {done.payUrl && <div style={{ marginTop: 16 }}><b>Payment link</b><div style={{ display: 'flex', gap: 8, marginTop: 6 }}><input readOnly value={done.payUrl} style={{ flex: 1 }} onFocus={(e) => e.currentTarget.select()} /><button className="btn" onClick={() => { navigator.clipboard?.writeText(done.payUrl); toast.ok('Link copied'); }}>Copy</button></div></div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        {done.whatsapp && <a className="btn pri" href={done.whatsapp} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>}
        <Link className="btn" href={'/orders/' + done.id}>Open order</Link>
        <button className="btn" onClick={() => { setDone(null); setF({ ...BLANK }); setItems([]); }}>Create another</button>
      </div></div></>;
  return <><PageHead title="Create order" sub="For customers who can't order online. Stock, invoice and emails work like a website order."><Link className="btn" href="/orders">Back to orders</Link></PageHead>
    <form onSubmit={submit} style={{ display: 'grid', gap: 16, maxWidth: 860 }}>
      <div className="card" style={{ padding: 18 }}><h3 style={{ margin: '0 0 12px' }}>Customer</h3>
        <div className="grid g2"><Field label="Full name *"><input required minLength={2} value={f.name} onChange={set('name')} /></Field><Field label="Mobile / WhatsApp *"><input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="10-digit number" /></Field>
          <Field label="Email *" hint="Order confirmation and payment link go here."><input required type="email" value={f.email} onChange={set('email')} /></Field><Field label="GSTIN (optional)"><input maxLength={15} value={f.gstin} onChange={set('gstin')} /></Field></div>
        <Field label="Delivery address *"><input required minLength={6} value={f.addr} onChange={set('addr')} placeholder="House / street / area" /></Field>
        <div className="grid g2"><Field label="City *"><input required value={f.city} onChange={set('city')} /></Field><Field label="State *"><select value={f.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Pincode *"><input required inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" value={f.pin} onChange={set('pin')} /></Field></div></div>

      <div className="card" style={{ padding: 18 }}><h3 style={{ margin: '0 0 12px' }}>Products</h3>
        <Field label="Search a product to add"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 2 letters, e.g. EliteBook" /></Field>
        {found.data?.rows?.length > 0 && <div className="card" style={{ padding: 6, margin: '6px 0 12px' }}>{found.data.rows.map((p: any) => <button type="button" key={p.id} className="btn sm" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', margin: '2px 0' }} onClick={() => add(p)}><span>{p.title}</span><b>{rupees(p.price)}</b></button>)}</div>}
        {items.length > 0 && <table><thead><tr><th>Product</th><th>Qty</th><th>Warranty extension</th><th>Price</th><th /></tr></thead><tbody>{items.map((i) => <tr key={i.slug}>
          <td style={{ maxWidth: 300 }}>{i.title}</td>
          <td><input type="number" min={1} max={20} value={i.qty} onChange={(e) => upd(i.slug, { qty: Math.max(1, Number(e.target.value) || 1) })} style={{ width: 64 }} /></td>
          <td><select value={i.warrantyMonths} onChange={(e) => upd(i.slug, { warrantyMonths: Number(e.target.value) })}><option value={0}>None</option>{Object.keys(fees).map((m) => <option key={m} value={m}>+{m} months ({rupees(fees[m])})</option>)}</select></td>
          <td>{rupees((i.price + (i.warrantyMonths ? Number(fees[String(i.warrantyMonths)] ?? 0) : 0)) * i.qty)}</td>
          <td><button type="button" className="btn sm" onClick={() => setItems((l) => l.filter((x) => x.slug !== i.slug))}>Remove</button></td></tr>)}</tbody></table>}
        {!items.length && <div className="hint">No products added yet.</div>}</div>

      <div className="card" style={{ padding: 18 }}><h3 style={{ margin: '0 0 12px' }}>Payment and delivery</h3>
        <div className="grid g2"><Field label="Payment mode"><select value={f.payment} onChange={set('payment')}><option value="cod">Cash on delivery</option><option value="upi">UPI (direct to our UPI ID)</option><option value="card">Card (payment link)</option><option value="emi">EMI (payment link)</option></select></Field>
          <Field label="Delivery"><select value={f.delivery} onChange={set('delivery')}><option value="standard">Free delivery · 4–6 days</option><option value="express">BlueDart Express · 3–5 days</option></select></Field>
          <Field label="Coupon code (optional)"><input value={f.coupon} onChange={(e) => setF({ ...f, coupon: e.target.value.toUpperCase() })} /></Field>
          <Field label="Extra discount (₹, optional)" hint="Flat amount off the items total."><input type="number" min={0} value={f.discount} onChange={set('discount')} /></Field></div>
        <Field label="Note for the team (optional)"><input maxLength={500} value={f.note} onChange={set('note')} /></Field>
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {online && <label className="row"><input type="checkbox" checked={f.paidNow} onChange={set('paidNow')} /> Payment already received (mark as paid, issue invoice)</label>}
          {f.payment === 'cod' && <label className="row"><input type="checkbox" checked={f.skipAdvance} onChange={set('skipAdvance')} /> Skip the COD advance (confirm the order without an advance payment)</label>}
          <label className="row"><input type="checkbox" checked={f.notify} onChange={set('notify')} /> Email the customer (order details{online ? ' and payment link' : ''})</label></div></div>

      <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}><div className="hint">Items total{off ? ' (before discount)' : ''}</div><b style={{ fontSize: 20 }}>{rupees(subtotal)}</b>{off > 0 && <div className="hint">Extra discount −{rupees(off)}. Delivery fee and GST are added by the server.</div>}</div>
        <button className="btn pri" disabled={busy || !items.length}>{busy ? 'Creating…' : 'Create order'}</button></div>
    </form></>;
}

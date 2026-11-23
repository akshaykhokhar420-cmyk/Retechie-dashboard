'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { get, patch, post, rupees, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Status, Alert, Field, Modal, useLoad, Loading } from '@/components/ui';

const COURIERS: Record<string, string> = {
  'Blue Dart': 'https://www.bluedart.com/trackdartresult?trackFor=0&trackNo={awb}',
  'Delhivery': 'https://www.delhivery.com/track-v2/package/{awb}',
  'DTDC': 'https://tracking.dtdc.com/ctbs-tracking/customerInterface.tr?submitName=showCityTrack&cType=Consignment&cnNo={awb}',
  'XpressBees': 'https://www.xpressbees.com/shipment/tracking?trackingId={awb}',
  'Ecom Express': 'https://ecomexpress.in/tracking/?awb_field={awb}',
  'Shadowfax': 'https://tracker.shadowfax.in/#/track?order={awb}',
  'India Post': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
  'Other': '',
};
const trackUrl = (c: string, awb: string) => (COURIERS[c] ?? '').replace('{awb}', encodeURIComponent(awb.trim()));

export default function OrderDetail() {
  const id = Number(useParams().id); const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get(`/orders/${id}`), [id]); const [note, setNote] = useState(''); const [ship, setShip] = useState<any>(null);
  if (!l.data) return <Loading error={l.error} />;
  const o = l.data; const w = can('orders.write');
  const run = async (fn: () => Promise<any>, ok: string) => { try { await fn(); toast.ok(ok); l.reload(); } catch (e) { toast.err(e); } };
  return <>
    <PageHead title={`Order ${o.number}`} sub={`Placed ${when(o.placedAt)}`}><Link className="btn" href="/orders">← Orders</Link><button className="btn" onClick={async () => { try { const i = await post(`/orders/${o.id}/invoice`); toast.ok('Invoice ' + i.invoice_no + ' ready'); window.open(`/api/v1/admin/invoices/${i.id}/pdf`, '_blank'); } catch (e) { toast.err(e); } }}>Invoice (PDF)</button><Status s={o.status} /><Status s={o.paymentStatus} /></PageHead>
    {o.paymentMethod !== 'cod' && o.paymentStatus !== 'paid' && <Alert kind="warn">Online payment has not been confirmed by the payment gateway. This order cannot be packed or shipped until it is.</Alert>}
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div>
        <div className="card"><h2>Items</h2><table><tbody>{o.items.map((i: any, k: number) => <tr key={k}><td>{i.title}<div className="hint">{i.sku} · grade {i.grade}{i.warrantyMonths ? ` · +${i.warrantyMonths}m warranty` : ''}</div></td><td>{i.qty} × {rupees(i.unitPrice)}</td><td>{rupees(i.lineTotal ?? i.unitPrice * i.qty)}</td></tr>)}</tbody></table>
          <div style={{ textAlign: 'right', marginTop: 8 }}>Subtotal {rupees(o.subtotal)}<br />{o.discount > 0 && <>Discount −{rupees(o.discount)} {o.coupon && `(${o.coupon})`}<br /></>}Shipping {rupees(o.shipping)}<br /><span className="hint">GST included {rupees(o.gstIncluded)}</span><br /><b>Total {rupees(o.total)}</b></div></div>
        <div className="card"><h2>Timeline</h2>{o.events.map((e: any, i: number) => <div key={i} style={{ padding: '4px 0' }}><b>{e.event.replace(/_/g, ' ')}</b> <span className="hint">{when(e.created_at)}</span> {e.note}</div>)}</div>
        {o.returns?.length > 0 && <div className="card"><h2>Returns</h2>{o.returns.map((r: any) => <div key={r.id}><Status s={r.status} /> {r.reason} <span className="hint">{r.detail}</span>
          {w && <div className="row" style={{ margin: '6px 0' }}>{['approved', 'picked_up', 'refunded', 'rejected'].filter((s) => s !== r.status).map((s) => <button key={s} className="btn sm" onClick={() => run(() => patch('/returns/' + r.id, { status: s }), 'Return updated')}>{s.replace('_', ' ')}</button>)}</div>}</div>)}</div>}
      </div>
      <div>
        <div className="card"><h2>Customer</h2>{o.contact.name}<br />{o.contact.email}<br />{o.contact.phone}<p>{o.address.line1}, {o.address.city}, {o.address.state} {o.address.pincode}</p>{o.gstin && <p>GSTIN: {o.gstin}</p>}</div>
        <div className="card"><h2>Fulfilment</h2>
          {w && o.allowedNext.length > 0 && <><Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="row">{o.allowedNext.map((s: string) => s === 'shipped' ? <button key={s} className="btn pri" onClick={() => setShip({ carrier: 'Delhivery', other: '', trackingNumber: '', trackingUrl: '', eta: '', urlEdited: false })}>Add shipment…</button> : <button key={s} className={'btn ' + (s === 'cancelled' ? 'dng' : 'pri')} onClick={() => run(() => patch(`/orders/${id}/status`, { status: s, note }), `Order ${s}`)}>Mark {s}</button>)}</div></>}
          {o.status === 'confirmed' && !o.allowedNext.includes('shipped') && <p className="hint" style={{ marginTop: 8 }}><button className="btn" onClick={() => setShip({ carrier: 'Delhivery', other: '', trackingNumber: '', trackingUrl: '', eta: '', urlEdited: false })}>Already shipped? Add courier &amp; AWB…</button></p>}
          {!o.allowedNext.length && <p className="hint">This order is {o.status}; no further steps.</p>}
          {o.shipment && <div style={{ marginTop: 10 }}><b>{o.shipment.carrier}</b> · {o.shipment.trackingNumber} <Status s={o.shipment.status} />{o.shipment.trackingUrl && <> · <a href={o.shipment.trackingUrl} target="_blank" rel="noopener noreferrer">track</a></>}
            {w && o.shipment.status === 'shipped' && <div style={{ marginTop: 6 }}><button className="btn sm" onClick={() => run(() => patch(`/orders/${id}/shipment`, { status: 'out_for_delivery' }), 'Updated')}>Out for delivery</button></div>}</div>}</div>
        <div className="card"><h2>Payment</h2><div>{o.paymentMethod?.toUpperCase()} · <Status s={o.paymentStatus} /></div>{o.payments?.map((p: any) => <div key={p.id} className="hint">{p.provider} {p.method} {rupees(p.amount)} — {p.status}</div>)}
          {w && <div className="row" style={{ marginTop: 8 }}>{o.paymentMethod === 'cod' && o.paymentStatus !== 'paid' && <button className="btn sm" onClick={() => run(() => patch(`/orders/${id}/payment`, { status: 'paid', note: 'Cash collected' }), 'Marked paid')}>Mark COD paid</button>}{o.paymentStatus === 'paid' && <button className="btn sm dng" onClick={() => run(() => patch(`/orders/${id}/payment`, { status: 'refunded', note }), 'Marked refunded')}>Mark refunded</button>}</div>}
          <p className="hint">Online payments are marked paid only by the gateway’s verified webhook, never by hand.</p></div>
      </div></div>
    {ship && <Modal title="Shipment details" onClose={() => setShip(null)} footer={<><button className="btn" onClick={() => setShip(null)}>Cancel</button><button className="btn pri" onClick={async () => { const carrier = ship.carrier === 'Other' ? ship.other.trim() : ship.carrier; if (carrier.length < 2 || ship.trackingNumber.trim().length < 3) { toast.err(new Error('Enter the courier and AWB / tracking number')); return; } const b: any = { carrier, trackingNumber: ship.trackingNumber.trim() }; if (ship.trackingUrl) b.trackingUrl = ship.trackingUrl; if (ship.eta) b.eta = ship.eta; try { if (o.status === 'confirmed') await patch(`/orders/${id}/status`, { status: 'packed', note }).catch(() => {}); await post(`/orders/${id}/shipment`, b); toast.ok('Shipped — customer notified'); setShip(null); l.reload(); } catch (e) { toast.err(e); } }}>Mark shipped</button></>}>
      <Field label="Courier company"><select value={ship.carrier} onChange={(e) => { const c = e.target.value; setShip({ ...ship, carrier: c, trackingUrl: ship.urlEdited ? ship.trackingUrl : trackUrl(c, ship.trackingNumber) }); }}>{Object.keys(COURIERS).map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
      {ship.carrier === 'Other' && <Field label="Courier name"><input value={ship.other} onChange={(e) => setShip({ ...ship, other: e.target.value })} placeholder="e.g. Professional Couriers" /></Field>}
      <Field label="AWB / tracking number"><input value={ship.trackingNumber} onChange={(e) => { const n = e.target.value; setShip({ ...ship, trackingNumber: n, trackingUrl: ship.urlEdited ? ship.trackingUrl : trackUrl(ship.carrier, n) }); }} /></Field>
      <Field label="Tracking link (auto-filled, editable)"><input value={ship.trackingUrl} onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value, urlEdited: true })} /></Field><Field label="Expected delivery"><input type="date" value={ship.eta} onChange={(e) => setShip({ ...ship, eta: e.target.value })} /></Field></Modal>}
  </>;
}

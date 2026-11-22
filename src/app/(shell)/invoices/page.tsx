'use client';
import { useState } from 'react';
import { get, post, del } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Badge, useLoad, Loading } from '@/components/ui';

const inr = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN');
const when = (d: any) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export default function Invoices() {
  const { can } = useAuth(); const toast = useToast(); const [q, setQ] = useState(''); const [busy, setBusy] = useState(0); const [page, setPage] = useState(0); const [no, setNo] = useState(''); const PER = 50;
  const l = useLoad(() => get(`/invoices?limit=${PER}&offset=${page * PER}&q=` + encodeURIComponent(q)), [q, page]); const w = can('orders.write');
  if (!l.data) return <Loading error={l.error} />;
  const resend = async (id: number) => { setBusy(id); try { const r = await post(`/invoices/${id}/resend`); r.sent ? toast.ok('Invoice e-mailed') : toast.err(new Error('Not sent — set up SMTP in Settings → email')); l.reload(); } catch (e) { toast.err(e); } setBusy(0); };
  const remove = async (id: number, n: string) => { if (!window.confirm(`Delete invoice ${n}? The order stays; only the invoice record is removed.`)) return; setBusy(id); try { await del(`/invoices/${id}`); toast.ok('Invoice deleted'); l.reload(); } catch (e) { toast.err(e); } setBusy(0); };
  const create = async () => { if (!no.trim()) return; setBusy(-1); try { const r = await post('/invoices/create', { order_number: no.trim() }); toast.ok(`Invoice ${r.invoice_no} ready`); setNo(''); setPage(0); l.reload(); } catch (e) { toast.err(e); } setBusy(0); };
  const total = Number(l.data.total ?? l.data.rows.length); const pages = Math.max(1, Math.ceil(total / PER));
  return <><PageHead title="Invoices" sub="GST invoices are created automatically: when an online payment is confirmed, or when a COD order is shipped. Each one is numbered in sequence (INV/2026-27/0001) and e-mailed to the customer as a PDF. To create one for any other order, open the order and click “Invoice (PDF)”."><a className="btn" href="/api/v1/admin/invoices/sample.pdf" target="_blank" rel="noreferrer">View sample invoice</a></PageHead>
    <div className="card" style={{ padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}><input placeholder="Search invoice no, order, name or e-mail…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} style={{ flex: '1 1 320px' }} />
      {w && <><input placeholder="Order no. (e.g. WC13912)" value={no} onChange={(e) => setNo(e.target.value)} style={{ width: 200 }} /><button className="btn" disabled={busy === -1} onClick={create}>{busy === -1 ? 'Creating…' : 'Create invoice'}</button></>}</div>
    <div className="card tw"><table><thead><tr><th>Invoice no.</th><th>Order</th><th>Customer</th><th>Amount</th><th>Issued</th><th>E-mailed</th><th /></tr></thead><tbody>
      {l.data.rows.map((r: any) => <tr key={r.id}><td><b>{r.invoice_no}</b></td><td>{r.order_number}</td><td>{r.contact_name}<br /><small>{r.contact_email}</small></td><td>{inr(r.total)}</td><td>{when(r.issued_at)}</td>
        <td>{r.emailed_at ? <Badge>Sent {when(r.emailed_at)}</Badge> : <Badge>Not sent</Badge>}</td>
        <td className="row"><a className="btn sm" href={`/api/v1/admin/invoices/${r.id}/pdf`} target="_blank" rel="noreferrer">PDF</a>{w && <button className="btn sm" disabled={busy === r.id} onClick={() => resend(r.id)}>{busy === r.id ? 'Sending…' : 'Re-send'}</button>}{w && <button className="btn sm" disabled={busy === r.id} onClick={() => remove(r.id, r.invoice_no)}>Delete</button>}</td></tr>)}
      {!l.data.rows.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>No invoices yet. They appear here as soon as an order is paid or shipped.</td></tr>}
    </tbody></table></div>
    <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 12 }}><button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button><small>Page {page + 1} of {pages} · {total.toLocaleString('en-IN')} invoices</small><button className="btn sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next →</button></div></>;
}

'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { get, rupees, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Loading, useLoad, Status, Alert, Empty } from '@/components/ui';
import Icon from '@/components/Icon';

const STORE = (process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000').replace(/\/$/, '');
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Burning the midnight oil' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night'; };
const EMO = () => { const h = new Date().getHours(); return h < 5 ? '🌙' : h < 12 ? '☀️' : h < 17 ? '👋' : h < 21 ? '🌆' : '🌙'; };
const sample = (v: any) => !v || /90000 00000|support@retechie\.in|AAKCR1234|example\.com/i.test(String(v));

function Stat({ n, l, href, tone, icon }: { n: any; l: string; href?: string; tone?: 'w' | 'i'; icon: string }) {
  const b = <div className="stat"><span className={'si ' + (tone || '')}><Icon n={icon} /></span><b>{n}</b><span>{l}</span></div>;
  return href ? <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{b}</Link> : b;
}

function RevenueChart({ rows }: { rows: any[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = useMemo(() => {
    const m = new Map(rows.map((r) => [String(r.d).slice(0, 10), r])); const out: { d: string; revenue: number; orders: number }[] = [];
    for (let i = 13; i >= 0; i--) { const dt = new Date(Date.now() - i * 864e5); const k = dt.toISOString().slice(0, 10); const r: any = m.get(k); out.push({ d: k, revenue: Number(r?.revenue || 0), orders: Number(r?.orders || 0) }); }
    return out;
  }, [rows]);
  const max = Math.max(1, ...days.map((x) => x.revenue)); const total = days.reduce((a, x) => a + x.revenue, 0); const orders = days.reduce((a, x) => a + x.orders, 0);
  const W = 700, H = 190, pad = 22, bw = (W - pad * 2) / days.length;
  return <div style={{ position: 'relative' }}>
    <div className="row sp" style={{ marginBottom: 6 }}><div><div className="hint">Last 14 days</div><b style={{ fontSize: 24, letterSpacing: '-.02em' }}>{rupees(total)}</b> <span className="hint" style={{ display: 'inline' }}>· {orders} order{orders === 1 ? '' : 's'}</span></div></div>
    {total === 0 ? <Empty title="No sales in the last 14 days" text="Orders will appear here as soon as customers start buying." /> :
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Revenue per day">
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} className="grid-l" x1={pad} x2={W - pad} y1={H - 24 - (H - 50) * f} y2={H - 24 - (H - 50) * f} />)}
        {days.map((x, i) => { const h = Math.max(x.revenue ? 4 : 2, (H - 50) * (x.revenue / max)); const cx = pad + i * bw;
          return <g key={x.d} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={cx} y={0} width={bw} height={H - 20} fill="transparent" />
            <rect className="bar-r" x={cx + bw * 0.18} y={H - 24 - h} width={bw * 0.64} height={h} rx={5} style={{ opacity: x.revenue ? undefined : 0.25 }} />
            {(i % 2 === 0 || days.length < 8) && <text x={cx + bw / 2} y={H - 6} textAnchor="middle">{new Date(x.d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</text>}</g>; })}
      </svg>}
    {hover !== null && total > 0 && <div className="tip" style={{ left: `${((pad + hover * bw + bw / 2) / W) * 100}%`, top: 70 }}>{new Date(days[hover].d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: {rupees(days[hover].revenue)} · {days[hover].orders} order{days[hover].orders === 1 ? '' : 's'}</div>}
  </div>;
}


function Bars({ v, red }: { v: number[]; red?: boolean }) { const m = Math.max(1, ...v); return <div className={'mb' + (red ? ' red' : '')}>{v.map((x, i) => <i key={i} className={i % 3 === 0 ? 'hi' : ''} style={{ height: Math.max(8, (x / m) * 100) + '%' }} />)}</div>; }
function Gauge({ pct }: { pct: number }) { const p = Math.max(0, Math.min(100, pct)); const L = Math.PI * 70; return <svg className="gauge" viewBox="0 0 180 100"><path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="#0d2b26" strokeWidth="22" strokeLinecap="butt" opacity=".92" /><path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="#3be07a" strokeWidth="22" strokeDasharray={`${(L * p) / 100} ${L}`} /></svg>; }
function Ring({ pct, label, color = '#e8632b' }: { pct: number; label: string; color?: string }) { const r = 26, C = 2 * Math.PI * r; return <div className="ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r={r} fill="none" stroke="#ffffff22" strokeWidth="6" /><circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(C * Math.max(0, Math.min(100, pct))) / 100} ${C}`} /></svg><span>{label}</span></div>; }
const pctChg = (a: number, b: number) => (b ? ((a - b) / b) * 100 : a ? 100 : 0);

export default function Overview() {
  const { me, can } = useAuth(); const { data: d, error } = useLoad(() => get('/dashboard'), []); const st = useLoad(() => get('/settings').catch(() => null), []);
  const cl = useMemo(() => {
    const S: any[] = st.data || []; if (!S.length) return null;
    const val = (k: string) => S.find((s) => s.key === k)?.value;
    const co = val('company') || {}; const wa = val('whatsapp') || {}; const smtp = val('email.smtp');
    const pay = S.filter((s) => /^payments\.(razorpay|stripe|paypal)$/.test(s.key)).some((s) => s.value && typeof s.value === 'object' && Object.values(s.value).some((v) => !!v && v !== ''));
    return [
      { ok: !sample(co.phone) && !sample(co.email) && !sample(co.gstin), t: 'Add your real business details', s: 'Phone, e-mail, address and GSTIN appear on invoices and the footer.', href: '/settings' },
      { ok: pay, t: 'Connect online payments', s: 'Razorpay, Stripe or PayPal keys, so customers can pay by UPI and card.', href: '/payments' },
      { ok: !!smtp?.host, t: 'Set up order e-mails (SMTP)', s: 'Order confirmations and invoices are e-mailed to customers.', href: '/settings' },
      { ok: !!(wa.number || co.whatsapp), t: 'Add your WhatsApp number', s: 'Shows the green chat button on the website.', href: '/whatsapp' },
      { ok: (d?.products?.published ?? 0) > 0, t: 'Publish your products', s: 'Import from retechie.com or add products by hand.', href: '/products' },
    ];
  }, [st.data, d]);
  if (!d) return <Loading error={error} />;
  const done = cl ? cl.filter((x) => x.ok).length : 0;
  const first = me?.name?.split(' ')[0] ?? '';
  const QA: [string, string, string, string][] = [['/products/new', 'Add product', 'plus', 'products.write'], ['/orders', 'View orders', 'cart', 'orders.read'], ['/invoices', 'Invoices', 'file', 'orders.read'], ['/collections', 'Collection pages', 'tag', 'content.read'], ['/pages', 'Edit home page', 'layout', 'pages.read'], ['/whatsapp', 'WhatsApp chat', 'chat', 'settings.read']];
  const days: { revenue: number; orders: number }[] = []; { const m = new Map<string, any>((d.revenueByDay || []).map((r: any) => [String(r.d).slice(0, 10), r])); for (let i = 13; i >= 0; i--) { const r = m.get(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)); days.push({ revenue: Number(r?.revenue || 0), orders: Number(r?.orders || 0) }); } }
  const sum = (a: number, z: number, k: 'revenue' | 'orders') => days.slice(a, z).reduce((x, y) => x + y[k], 0);
  const revChg = pctChg(sum(7, 14, 'revenue'), sum(0, 7, 'revenue')), ordChg = pctChg(sum(7, 14, 'orders'), sum(0, 7, 'orders'));
  const fulfil = d.orders.total ? Math.round((d.orders.completed / d.orders.total) * 100) : 0;
  const live = d.products.total ? Math.round((d.products.published / d.products.total) * 100) : 0;
  const clPct = cl ? Math.round((done / cl.length) * 100) : 0;
  const Delta = ({ v }: { v: number }) => <em><i className={v >= 0 ? 'up' : 'dn'}>{v >= 0 ? '↗' : '↘'} {Math.abs(v).toFixed(1)}%</i>than last week</em>;
  return <>
    <div className="hd"><div><h1>{greet()}{first ? `, ${first}` : ''} {EMO()}</h1><div className="hint">{(() => { const p = d.orders.pending, lo = d.products.lowStock ?? 0; const bits = [p > 0 ? `${p} order${p > 1 ? 's' : ''} waiting for you` : 'no orders waiting', lo > 0 ? `${lo} low-stock product${lo > 1 ? 's' : ''}` : 'stock looks healthy']; return `Here's your store today — ${bits.join(' · ')}. Let's make it a great day for Retechie.`; })()}</div></div><div className="sp" />{can('products.write') && <Link href="/products/new" className="btn pri">Add product</Link>}</div>
    {(d.content.drafts > 0 || d.content.sectionDrafts > 0) && <Alert kind="warn"><Icon n="alert" width={18} height={18} /><span>You have unpublished changes: {d.content.drafts} text edit(s) and {d.content.sectionDrafts} section draft(s). They are not live until published.</span></Alert>}

    <div className="kpis">
      <Link href="/orders" className="kpi"><div><small>Revenue, last 30 days</small><b>{rupees(d.orders.revenue30d)}</b><Delta v={revChg} /></div><Bars v={days.map((x) => x.revenue)} /></Link>
      <Link href="/orders" className="kpi"><div><small>Orders to process</small><b>{d.orders.pending}</b><Delta v={ordChg} /></div><Bars v={days.map((x) => x.orders)} red={d.orders.pending > 0} /></Link>
      <Link href="/products" className="kpi"><div><small>Products live / total</small><b>{d.products.published}<span style={{ fontSize: 16, color: 'var(--mut)' }}> / {d.products.total}</span></b><em><i className={d.products.lowStock ? 'dn' : 'up'}>{d.products.lowStock}</i>low-stock</em></div><Bars v={[d.products.published, d.products.draft, d.products.lowStock, d.products.total, d.products.published, d.products.draft, d.products.total]} /></Link>
    </div>

    <div className="row3">
      <div className="wd"><h3>Order fulfilment</h3><div className="big">{fulfil}<span>%</span></div><Gauge pct={fulfil} /><div className="hint" style={{ textAlign: 'center' }}>{d.orders.completed} of {d.orders.total} orders delivered</div></div>
      <div className="wd"><h3>Catalogue health</h3><div className="big">{live}<span>%</span></div>
        <ul className="lg"><li>Published<b>{d.products.published}</b></li><li style={{ ['--c' as any]: '#e8a33b' }}>Draft<b>{d.products.draft}</b></li><li style={{ ['--c' as any]: '#d6453a' }}>Low stock<b>{d.products.lowStock}</b></li></ul>
        <Link href="/products" className="ol">View details</Link></div>
      <div className="wd l wide"><h3>Sales, last 14 days</h3><RevenueChart rows={d.revenueByDay || []} /></div>
    </div>

    <div className="row2"><div>
      {cl && <Link href="/settings" className="pill dk"><Ring pct={clPct} label={`${done}/${cl.length}`} /><div><b>Go-live checklist</b><small>{done === cl.length ? 'All set — you are ready to launch.' : cl.find((x) => !x.ok)?.t}</small></div></Link>}
      <Link href="/aftersales" className="pill lt"><Ring pct={Math.min(100, (d.support.open || 0) * 20)} label={String(d.support.open)} color="#2fbf63" /><div><b>Open support requests</b><small>Returns, warranty claims and customer messages.</small></div></Link>
      <Link href="/customers" className="pill lt"><Ring pct={Math.min(100, d.customers)} label={String(d.customers)} color="#2fbf63" /><div><b>Customers</b><small>{d.orders.total} orders all-time · {d.media.count ?? d.media.total ?? 0} images</small></div></Link>
    </div>
      <a className="promo" href={STORE} target="_blank" rel="noreferrer"><span className="go">↗</span><div><small>Retechie storefront</small><h2>See your store the way customers do</h2></div><div className="tags"><span>Live site</span><span>{d.products.published} products</span><span>{fulfil}% delivered</span></div></a>
    </div>

    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', alignItems: 'start' }}>
      <div className="card tw"><div className="row sp" style={{ padding: '18px 20px 6px' }}><h2 style={{ margin: 0 }}>Recent orders</h2><Link href="/orders" className="btn sm">View all</Link></div>
        {d.recentOrders.length ? <table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Placed</th></tr></thead><tbody>{d.recentOrders.map((o: any) => <tr key={o.order_number}><td><Link href={`/orders`}><b>{o.order_number}</b></Link></td><td>{o.contact_name}</td><td>{rupees(o.grand_total)}</td><td><Status s={o.status} /> <Status s={o.payment_status} /></td><td>{when(o.placed_at)}</td></tr>)}</tbody></table> : <Empty title="No orders yet" text="Your first order will show up here." />}</div>
    </div>
  </>;
}

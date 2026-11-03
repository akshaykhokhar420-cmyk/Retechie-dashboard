'use client';
import Link from 'next/link';
import { useState } from 'react';
import { get, patch, rupees, qs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import Icon from '@/components/Icon';
import { PageHead, Pager, Badge, useLoad, useDebounced, Loading } from '@/components/ui';

const STORE = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
const TABS: [string, string][] = [['', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['archived', 'Archived']];

export default function Products() {
  const { can } = useAuth(); const toast = useToast(); const [q, setQ] = useState(''); const dq = useDebounced(q); const [status, setStatus] = useState(''); const [cat, setCat] = useState(''); const [off, setOff] = useState(0);
  const l = useLoad(() => get('/products' + qs({ q: dq, status, category: cat, limit: 25, offset: off })), [dq, status, cat, off]);
  const counts = useLoad(async () => { const r = await Promise.all(TABS.map(([s]) => get('/products' + qs({ status: s, limit: 1 })))); return Object.fromEntries(TABS.map(([s], i) => [s, r[i].total])); }, []);
  const cats = useLoad(() => get('/categories'), []);
  const toggle = async (p: any) => { try { await patch(`/products/${p.id}/status`, { status: p.status === 'published' ? 'draft' : 'published' }); toast.ok(p.status === 'published' ? 'Moved to draft' : 'Published'); l.reload(); counts.reload(); } catch (e) { toast.err(e); } };
  return <><PageHead title="Products" sub="Everything you sell. Click a product to edit it.">{can('products.write') && <Link className="btn pri" href="/products/new"><Icon n="plus" /> New product</Link>}</PageHead>
    <div className="ptabs">{TABS.map(([s, t]) => <button key={s} className={status === s ? 'on' : ''} onClick={() => { setStatus(s); setOff(0); }}>{t}<i>{counts.data?.[s] ?? '–'}</i></button>)}</div>
    <div className="tbar"><div className="sbox"><Icon n="search" /><input placeholder="Search title or SKU…" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} /></div>
      <select value={cat} onChange={(e) => { setCat(e.target.value); setOff(0); }}><option value="">All categories</option>{(cats.data ?? []).map((c: any) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></div>
    {!l.data ? <Loading error={l.error} /> : <><div className="card tw plist"><table><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead><tbody>{l.data.rows.map((p: any) => { const st = Number(p.stock ?? p.quantity ?? 0); return <tr key={p.id}>
      <td><div className="pc"><div className="thumb" style={{ backgroundImage: p.image ? `url(${p.image.url})` : undefined }} /><div><Link href={`/products/${p.id}`}><b>{p.title}</b></Link><div className="hint">{[p.brand, p.grade && 'Grade ' + p.grade, p.category].filter(Boolean).join(' · ')} · SKU {p.sku}</div></div></div></td>
      <td><b>{rupees(p.price)}</b>{p.mrp > p.price && <div className="hint"><s>{rupees(p.mrp)}</s> · {Math.round((1 - p.price / p.mrp) * 100)}% off</div>}</td>
      <td>{st <= 0 ? <Badge kind="err">Out of stock</Badge> : st <= 3 ? <Badge kind="warn">Low · {st}</Badge> : <span className="stk"><i style={{ width: Math.min(100, st * 8) + '%' }} />{st} in stock</span>}</td>
      <td>{can('products.publish') ? <label className="sw mini-sw" title={p.status === 'published' ? 'Click to unpublish' : 'Click to publish'}><input type="checkbox" checked={p.status === 'published'} onChange={() => toggle(p)} /><i /><span><b style={{ textTransform: 'capitalize' }}>{p.status}</b></span></label> : <Badge>{p.status}</Badge>}</td>
      <td className="acts"><Link className="btn sm" href={`/products/${p.id}`}>Edit</Link>{p.status === 'published' && <a className="btn sm" target="_blank" rel="noreferrer" href={`${STORE}/product/${p.slug}`}>View ↗</a>}</td></tr>; })}</tbody></table>{!l.data.rows.length && <div className="empty-row">No products match your filters.</div>}</div>
      <Pager total={l.data.total} limit={25} offset={off} onChange={setOff} /></>}</>;
}

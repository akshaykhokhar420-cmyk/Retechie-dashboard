'use client';
import { useState } from 'react';
import { get, post, put, del } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import RichEditor from '@/components/RichEditor';
import { PageHead, Badge, Modal, Field, useLoad, Loading, confirmBox } from '@/components/ui';

const BLANK = { slug: '', title: '', heading: '', intro: '', topContent: '', faqs: [] as { q: string; a: string }[], content: '', seoTitle: '', seoDescription: '', category: '', brands: '', grade: '', minPrice: '' as any, maxPrice: '' as any, ram: '', cpu: '', use: '', q: '', sort: '', isPublished: true, position: 0 };
const toForm = (r: any) => ({ id: r.id, slug: r.slug, title: r.title, heading: r.heading ?? '', intro: r.intro ?? '', topContent: r.top_content ?? '', faqs: (() => { try { return JSON.parse(r.faqs || '[]'); } catch { return []; } })(), content: r.content ?? '', seoTitle: r.seo_title ?? '', seoDescription: r.seo_description ?? '', category: r.category ?? '', brands: r.brands ?? '', grade: r.grade ?? '', minPrice: r.min_price ?? '', maxPrice: r.max_price ?? '', ram: r.ram ?? '', cpu: r.cpu ?? '', use: r.use_tags ?? '', q: r.query_text ?? '', sort: r.sort ?? '', isPublished: !!r.is_published, position: r.position ?? 0 });
const body = (f: any) => { const { id, ...b } = f; return { ...b, minPrice: b.minPrice === '' ? null : Number(b.minPrice), maxPrice: b.maxPrice === '' ? null : Number(b.maxPrice), position: Number(b.position) || 0 }; };
const filterText = (r: any) => [r.category && `Category: ${r.category}`, r.brands && `Brand: ${r.brands}`, r.grade && `Grade: ${r.grade}`, r.max_price && `Up to ₹${r.max_price}`, r.min_price && `From ₹${r.min_price}`, r.ram && `RAM: ${r.ram}`, r.cpu && `CPU: ${r.cpu}`, r.use_tags && `Use: ${r.use_tags}`, r.query_text && `Search: ${r.query_text}`].filter(Boolean).join(' · ') || 'All products';

export default function Collections() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/collections'), []); const cats = useLoad(() => get('/categories'), []); const [ed, setEd] = useState<any>(null);
  if (!l.data) return <Loading error={l.error} />;
  const w = can('content.write'); const set = (k: string, v: any) => setEd({ ...ed, [k]: v });
  async function save() { try { ed.id ? await put(`/collections/${ed.id}`, body(ed)) : await post('/collections', body(ed)); toast.ok('Saved'); setEd(null); l.reload(); } catch (e: any) { toast.err(e); } }
  return <><PageHead title="Collections" sub="Every row is a page on your site at /collections/your-url, with its own heading, text, SEO and a saved product filter. The main /collections page shows all products.">
    {w && <button className="btn pri" onClick={() => setEd({ ...BLANK, position: l.data.length })}>New collection page</button>}</PageHead>
    <div className="card tw"><table><thead><tr><th>Page URL</th><th>Heading</th><th>Shows</th><th>Status</th><th /></tr></thead><tbody>{l.data.map((r: any) => <tr key={r.id}>
      <td><a href={`${process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000'}/collections/${r.slug}`} target="_blank" rel="noreferrer">/collections/{r.slug}</a></td><td>{r.heading || r.title}</td><td>{filterText(r)}</td>
      <td>{r.is_published ? <Badge>Live</Badge> : <Badge>Hidden</Badge>}</td>
      <td className="row"><button className="btn sm" onClick={() => setEd(toForm(r))}>Edit</button>{w && <button className="btn sm dn" onClick={async () => { if (await confirmBox(`Delete /collections/${r.slug}?`)) { try { await del(`/collections/${r.id}`); toast.ok('Deleted'); l.reload(); } catch (e: any) { toast.err(e); } } }}>Delete</button>}</td></tr>)}</tbody></table></div>
    {ed && <Modal size="xl" title={ed.id ? 'Edit collection page' : 'New collection page'} onClose={() => setEd(null)} footer={<><button className="btn" onClick={() => setEd(null)}>Cancel</button>{w && <button className="btn pri" onClick={save}>Save</button>}</>}>
      <div className="grid g2"><Field label="Page URL" hint="Opens at /collections/this-url. Use the old WooCommerce slug to keep an old link working."><input value={ed.slug} onChange={(e) => set('slug', e.target.value)} placeholder="hp-refurbished-laptops" /></Field><Field label="Name (menus, breadcrumbs)"><input value={ed.title} onChange={(e) => set('title', e.target.value)} /></Field></div>
      <Field label="Page heading (H1)"><input value={ed.heading} onChange={(e) => set('heading', e.target.value)} /></Field>
      <Field label="Short intro under the heading"><textarea rows={2} value={ed.intro} onChange={(e) => set('intro', e.target.value)} /></Field>
      <RichEditor label="Content ABOVE the products" hint="Optional. Shown between the heading and the product list." value={ed.topContent} onChange={(v) => set('topContent', v)} />
      <h3 style={{ margin: '14px 0 6px' }}>Which products show</h3>
      <div className="grid g2"><Field label="Category"><select value={ed.category} onChange={(e) => set('category', e.target.value)}><option value="">All categories</option>{(cats.data ?? []).map((c: any) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field><Field label="Brand(s)" hint="Comma separated, e.g. HP or Dell,Lenovo"><input value={ed.brands} onChange={(e) => set('brands', e.target.value)} /></Field>
        <Field label="Min price (₹)"><input type="number" value={ed.minPrice} onChange={(e) => set('minPrice', e.target.value)} /></Field><Field label="Max price (₹)"><input type="number" value={ed.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} /></Field>
        <Field label="Grade(s)" hint="A+,A"><input value={ed.grade} onChange={(e) => set('grade', e.target.value)} /></Field><Field label="RAM (GB)" hint="e.g. 16,32"><input value={ed.ram} onChange={(e) => set('ram', e.target.value)} /></Field>
        <Field label="Processor" hint="e.g. i7 or ryzen"><input value={ed.cpu} onChange={(e) => set('cpu', e.target.value)} /></Field><Field label="Best for" hint="student, office, coding, gaming"><input value={ed.use} onChange={(e) => set('use', e.target.value)} /></Field>
        <Field label="Search words"><input value={ed.q} onChange={(e) => set('q', e.target.value)} /></Field><Field label="Sort"><select value={ed.sort} onChange={(e) => set('sort', e.target.value)}><option value="">Most popular</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option><option value="off">Biggest discount</option><option value="new">Newest</option></select></Field></div>
      <h3 style={{ margin: '14px 0 6px' }}>SEO</h3>
      <Field label="SEO title"><input value={ed.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} /></Field><Field label="Meta description"><textarea rows={2} value={ed.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} /></Field>
      <RichEditor label="Content BELOW the products" minHeight={220} value={ed.content} onChange={(v) => set('content', v)} />
      <h3 style={{ margin: '14px 0 6px' }}>FAQs <small style={{ fontWeight: 400 }}>— shown under the content; also sent to Google as FAQ data</small></h3>
      {ed.faqs.map((f: any, i: number) => <div className="card" key={i} style={{ padding: 12, marginBottom: 8 }}>
        <Field label={`Question ${i + 1}`}><input value={f.q} onChange={(e) => set('faqs', ed.faqs.map((x: any, j: number) => (j === i ? { ...x, q: e.target.value } : x)))} /></Field>
        <Field label="Answer"><textarea rows={3} value={f.a} onChange={(e) => set('faqs', ed.faqs.map((x: any, j: number) => (j === i ? { ...x, a: e.target.value } : x)))} /></Field>
        <button className="btn sm dn" onClick={() => set('faqs', ed.faqs.filter((_: any, j: number) => j !== i))}>Remove</button></div>)}
      <button className="btn sm" onClick={() => set('faqs', [...ed.faqs, { q: '', a: '' }])}>+ Add FAQ</button>
      <div className="grid g2"><Field label="Order in lists"><input type="number" value={ed.position} onChange={(e) => set('position', e.target.value)} /></Field><label className="row" style={{ alignSelf: 'end' }}><input type="checkbox" checked={ed.isPublished} onChange={(e) => set('isPublished', e.target.checked)} /> Live on the site</label></div>
    </Modal>}</>;
}

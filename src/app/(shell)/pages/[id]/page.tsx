'use client';
import { askConfirm } from '@/components/Confirm';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { get, post, put, patch, del, openPreview } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { JsonForm } from '@/components/JsonForm';
import { PageHead, Badge, Modal, Field, Alert, useLoad, Loading } from '@/components/ui';

type Sec = { id: number; key: string; type: string; position: number; visible: boolean; draft: any; published: any; hasDraft: boolean };
const SLOT_PAGES = ['shop', 'product', 'policy', 'contact', 'support', 'track', 'cart', 'checkout'];
const STARTERS: Record<string, any> = {
  rich_text: { title: '', bodyHtml: '' }, promo_banner: { title: '', text: '', ctaLabel: '', ctaUrl: '', imageMediaId: null }, help_cta: { title: '', text: '', ctaLabel: '', ctaUrl: '' },
  image_text: { title: '', bodyHtml: '', imageMediaId: null, layout: 'image-left' }, feature_list: { title: '', items: [{ title: '', text: '' }] }, newsletter: { title: '', text: '' },
};

export default function PageBuilder() {
  const id = Number(useParams().id); const toast = useToast(); const { can } = useAuth();
  const pages = useLoad(() => get('/pages'), [id]); const l = useLoad(() => get<{ types: string[]; sections: Sec[] }>(`/pages/${id}/sections`), [id]);
  const [open, setOpen] = useState<number | null>(null); const [adding, setAdding] = useState(false);
  const page = pages.data?.find((p: any) => p.id === id);
  if (!l.data || !page) return <Loading error={l.error || pages.error} />;
  const secs = l.data.sections; const drafts = secs.filter((s) => s.hasDraft).length; const w = can('pages.write');

  async function move(i: number, d: number) { const a = secs.map((s) => s.id); const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; try { await put(`/pages/${id}/sections/order`, { ids: a }); l.reload(); } catch (e) { toast.err(e); } }
  async function publish() { try { const r = await post(`/pages/${id}/publish`); await post(`/pages/${id}/publish-order`); toast.ok(`Published ${r.published} section(s) — the live page updates within a minute`); l.reload(); pages.reload(); } catch (e) { toast.err(e); } }
  return <>
    <PageHead title={page.title} sub={`/${page.slug === 'home' ? '' : page.slug} · ${page.status}`}>
      <Link className="btn" href="/pages">← All pages</Link><button className="btn" onClick={() => openPreview(page.slug === 'home' ? '/' : '/' + page.slug).catch(toast.err)}>Preview draft ↗</button>
      {can('pages.publish') && <button className="btn pri" onClick={publish} disabled={!drafts && page.status === 'published'}>Publish page{drafts ? ` (${drafts} draft)` : ''}</button>}
    </PageHead>
    {page.status !== 'published' && <Alert kind="warn">This page is not published. Publish it to make it visible on the site.</Alert>}
    <Alert kind="info">Text that is not part of a section (buttons, labels, the header and footer) is edited under <Link href="/content">Text &amp; labels</Link>.</Alert>
    {secs.map((s, i) => <Section key={s.id} slug={page.slug} s={s} pageId={id} i={i} n={secs.length} open={open === s.id} w={w} onToggle={() => setOpen(open === s.id ? null : s.id)} onMove={move} onChanged={l.reload} />)}
    {w && <button className="btn" onClick={() => setAdding(true)}>+ Add section</button>}
    {adding && <AddSection types={l.data.types} pageId={id} onClose={() => setAdding(false)} onDone={(sid) => { setAdding(false); l.reload(); setOpen(sid); }} />}
  </>;
}

function useHeroPresets(on: boolean) {
  const [p, setP] = useState<any[]>([]);
  useEffect(() => { if (on && !p.length) get('/hero-presets').then(setP).catch(() => {}); }, [on]); // eslint-disable-line
  return p;
}
function useVariants(on: boolean) {
  const [v, setV] = useState<Record<string, { id: number; name: string }[]>>({});
  useEffect(() => { if (on) get('/section-variants').then(setV).catch(() => {}); }, [on]);
  return v;
}
function Section({ slug, s, pageId, i, n, open, w, onToggle, onMove, onChanged }: { slug: string; s: Sec; pageId: number; i: number; n: number; open: boolean; w: boolean; onToggle: () => void; onMove: (i: number, d: number) => void; onChanged: () => void }) {
  const toast = useToast(); const base = s.draft ?? s.published ?? {}; const [cfg, setCfg] = useState<any>(null); const [raw, setRaw] = useState(false); const [rawText, setRawText] = useState(''); const value = cfg ?? base; const presets = useHeroPresets(open && s.type === 'hero_banner'); const variants = useVariants(open)[s.type];
  const run = async (fn: () => Promise<any>, ok?: string) => { try { await fn(); if (ok) toast.ok(ok); setCfg(null); onChanged(); } catch (e) { toast.err(e); } };
  const save = () => { let c = value; if (raw) { try { c = JSON.parse(rawText); } catch { return toast.err(new Error('The JSON is not valid')); } } return run(() => post(`/pages/${pageId}/sections`, { id: s.id, type: s.type, config: c }), 'Draft saved — publish the page to make it live'); };
  return <div className={'sec' + (s.visible ? '' : ' hidden')}>
    <div className="hd" onClick={onToggle}><b style={{ flex: 1 }}>{s.type.replace(/_/g, ' ')} <span className="hint">· {s.key}</span></b>{s.hasDraft && <Badge kind="warn">draft</Badge>}{!s.published && <Badge kind="err">never published</Badge>}{!s.visible && <Badge>hidden</Badge>}
      {w && <span className="row" onClick={(e) => e.stopPropagation()}><button className="btn sm" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="Move up">↑</button><button className="btn sm" disabled={i === n - 1} onClick={() => onMove(i, 1)} aria-label="Move down">↓</button>
        <button className="btn sm" onClick={() => run(() => patch(`/sections/${s.id}/visible`, { visible: !s.visible }))}>{s.visible ? 'Hide' : 'Show'}</button></span>}
      <span>{open ? '▲' : '▼'}</span></div>
    {open && <div className="bd">
      {!s.published && <Alert kind="warn">This section has never been published and is not on the live site.</Alert>}
      {s.type === 'hero_banner' && w && presets.length > 0 && <Field label="Hero design" hint="Switching design replaces the content below with that design's sample content (save the draft to keep it)."><select value={value.design ?? ''} onChange={async (e) => { const v = e.target.value; const pr = presets.find((x) => String(x.design) === v); if (pr && await askConfirm(`Switch to "${pr.name}"? Current content will be replaced.`)) { setCfg(pr.config); setRaw(false); } }}>{!value.design && <option value="">—</option>}{presets.map((x) => <option key={x.design} value={x.design}>{x.design}. {x.name} — {x.bestFor}</option>)}</select></Field>}
      {variants && w && <Field label="Design" hint="Pick the layout for this section. Your content stays the same — save the draft and publish to apply."><select value={value.variant ?? 1} onChange={(e) => setCfg({ ...value, variant: Number(e.target.value) })}>{variants.map((x) => <option key={x.id} value={x.id}>{x.id}. {x.name}</option>)}</select></Field>}
      {SLOT_PAGES.includes(slug) && w && <Field label="Placement" hint="This page has built-in content (it can't be moved). Choose whether this section appears above or below it."><select value={value.slot === 'top' ? 'top' : 'bottom'} onChange={(e) => setCfg({ ...value, slot: e.target.value })}><option value="top">Above the page content</option><option value="bottom">Below the page content</option></select></Field>}
      {raw ? <textarea style={{ minHeight: 320, fontFamily: 'monospace', fontSize: 12.5 }} value={rawText} onChange={(e) => setRawText(e.target.value)} /> : <JsonForm value={value} onChange={setCfg} />}
      <div className="sticky-bar">{w && <><button className="btn pri" onClick={save}>Save draft</button>
        {s.hasDraft && s.published && <button className="btn" onClick={() => run(() => del(`/sections/${s.id}/draft`), 'Draft discarded')}>Discard draft</button>}
        <button className="btn" onClick={() => { if (!raw) setRawText(JSON.stringify(value, null, 2)); else { try { setCfg(JSON.parse(rawText)); } catch { return toast.err(new Error('The JSON is not valid')); } } setRaw(!raw); }}>{raw ? 'Back to form' : 'Edit as JSON'}</button>
        <span className="grow" /><button className="btn dng" onClick={async () => await askConfirm('Delete this section from the page?') && run(() => del('/sections/' + s.id), 'Section deleted')}>Delete section</button></>}</div>
    </div>}
  </div>;
}
function AddSection({ types, pageId, onClose, onDone }: { types: string[]; pageId: number; onClose: () => void; onDone: (id: number) => void }) {
  const toast = useToast(); const [type, setType] = useState(types.includes('rich_text') ? 'rich_text' : types[0]); const [design, setDesign] = useState(1);
  const presets = useHeroPresets(type === 'hero_banner');
  const cfgFor = () => type === 'hero_banner' ? (presets.find((x) => x.design === design)?.config ?? { design }) : (STARTERS[type] ?? {});
  return <Modal title="Add a section" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={async () => { try { const r = await post(`/pages/${pageId}/sections`, { type, config: cfgFor() }); onDone(r.id); } catch (e) { toast.err(e); } }}>Add</button></>}>
    <Field label="Section type" hint="The new section starts hidden from the live site until you fill it in and publish the page."><select value={type} onChange={(e) => setType(e.target.value)}>{types.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></Field>
    {type === 'hero_banner' && <Field label="Design" hint="The same section can be added many times, anywhere on the page, each with a different design."><select value={design} onChange={(e) => setDesign(Number(e.target.value))}>{presets.map((x) => <option key={x.design} value={x.design}>{x.design}. {x.name} — {x.bestFor}</option>)}</select></Field>}</Modal>;
}

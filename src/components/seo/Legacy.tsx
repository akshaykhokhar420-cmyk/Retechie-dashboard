'use client';
import { askConfirm } from '@/components/Confirm';
import { useState } from 'react';
import { get, put, post, del, qs, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { JsonForm } from '@/components/JsonForm';
import { MediaField } from '@/components/Media';
import { PageHead, Tabs, Badge, Status, Modal, Field, Alert, useLoad, Loading } from '@/components/ui';


const SCRIPT_CATS: [string, string][] = [['analytics', 'Analytics'], ['marketing', 'Marketing'], ['functional', 'Functional'], ['personalisation', 'Personalisation']];
function Tags() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/cookies/scripts'), []); const [ed, setEd] = useState<Record<string, any>>({});
  if (!l.data) return <Loading error={l.error} />;
  const wr = can('seo.write') || can('cookies.write');
  const rows = [...l.data, ...(ed.new ? [ed.new] : [])];
  const upd = (id: string, patch: any, base: any) => setEd((x) => ({ ...x, [id]: { ...base, ...(x[id] ?? {}), ...patch } }));
  async function save(r: any, cur: any) { try { r.id === 'new' ? await post('/cookies/scripts', cur) : await put('/cookies/scripts/' + r.id, cur); toast.ok('Saved. It is live on the store now.'); setEd((x) => { const n = { ...x }; delete n[r.id]; return n; }); l.reload(); } catch (e) { toast.err(e); } }
  return <div><h2 style={{ margin: '18px 0 8px' }}>Tracking scripts</h2>
    <Alert kind="info">Paste the full snippet from Google Analytics, Tag Manager, Meta Pixel, Clarity, Bing UET or any other tool, including the &lt;script&gt; tags. The store adds it to the page automatically, and only after the visitor accepts the cookie category you pick. The &lt;noscript&gt; part is not needed. Only people with edit rights can change this, because a script can run code on your store.</Alert>
    {rows.map((r: any) => { const cur = { name: r.name, category: r.category, code: r.code, enabled: r.enabled, ...(ed[r.id] ?? {}) }; const dirty = !!ed[r.id];
      return <div className="card" key={r.id} style={{ padding: 16, marginTop: 12 }}>
        <div className="grid g2"><Field label="Name"><input disabled={!wr} value={cur.name} placeholder="e.g. Google Analytics 4" onChange={(e) => upd(r.id, { name: e.target.value }, r)} /></Field>
          <Field label="Load after visitor accepts"><select disabled={!wr} value={cur.category} onChange={(e) => upd(r.id, { category: e.target.value }, r)}>{SCRIPT_CATS.map(([k, n]) => <option key={k} value={k}>{n} cookies</option>)}</select></Field></div>
        <Field label="Script" hint={r.items?.length ? `Found ${r.items.length} script${r.items.length > 1 ? 's' : ''}: ${r.items.map((i: any) => (i.src ? new URL(i.src).host : 'inline code')).join(', ')}` : 'Paste the snippet exactly as the tool gives it.'}><textarea disabled={!wr} rows={7} spellCheck={false} style={{ fontFamily: 'monospace', fontSize: 12.5 }} value={cur.code} placeholder={'<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>\n<script>…</script>'} onChange={(e) => upd(r.id, { code: e.target.value }, r)} /></Field>
        <div className="row sp"><label className="sw" style={{ marginTop: 0 }}><input type="checkbox" disabled={!wr} checked={cur.enabled} onChange={(e) => upd(r.id, { enabled: e.target.checked }, r)} /><i /><span><b>{cur.enabled ? 'On' : 'Off'}</b><small>{cur.enabled ? 'Runs on the store after consent.' : 'Saved but not running.'}</small></span></label>
          {wr && <div className="row">{r.id !== 'new' && <button className="btn sm dn" onClick={async () => { if (await askConfirm(`Delete “${r.name}”?`)) { try { await del('/cookies/scripts/' + r.id); toast.ok('Deleted'); l.reload(); } catch (e) { toast.err(e); } } }}>Delete</button>}
            {r.id === 'new' && <button className="btn" onClick={() => setEd((x) => { const n = { ...x }; delete n.new; return n; })}>Cancel</button>}
            <button className="btn pri" disabled={!dirty && r.id !== 'new'} onClick={() => save(r, cur)}>Save</button></div>}</div>
      </div>; })}
    {wr && !ed.new && <button className="btn" style={{ marginTop: 12 }} onClick={() => setEd((x) => ({ ...x, new: { id: 'new', name: '', category: 'analytics', code: '', enabled: true, items: [] } }))}>+ Add script</button>}
    <p className="hint" style={{ marginTop: 10 }}>Scripts from other websites must be allowed by the store’s security policy. Common tools (Google, Meta, Bing, LinkedIn, TikTok, Hotjar, Clarity) already are. For anything else, add its address to <code>CSP_EXTRA_HOSTS</code> in the store’s environment.</p>
  </div>;
}

export function Global() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/seo/global'), []); const [g, setG] = useState<any>(null);
  if (!l.data) return <Loading error={l.error} />; const v = g ?? l.data;
  const set = (k: string, x: any) => setG({ ...v, [k]: x }); const T = (k: string, label: string, hint?: string, area?: boolean) => <Field label={label} hint={hint}>{area ? <textarea value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} /> : <input value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} />}</Field>;
  return <div className="card">
    {!v.indexingEnabled && <Alert kind="err">Indexing is switched off: the whole site tells search engines NOT to index it.</Alert>}
    <div className="grid g2">{T('siteName', 'Site name')}{T('baseUrl', 'Website base URL', 'e.g. https://www.retechie.in — used for canonicals, sitemap and structured data')}{T('defaultTitle', 'Default title')}{T('titleTemplate', 'Title template', '%s is replaced by the page title')}</div>
    {T('defaultDescription', 'Default meta description', undefined, true)}
    <div className="grid g2">{T('ogTitle', 'Default Open Graph title')}{T('ogDescription', 'Default Open Graph description')}{T('twitterSite', 'Twitter / X handle', '@yourbrand')}{T('defaultRobots', 'Default robots', 'index,follow')}
      <Field label="Twitter card"><select value={v.twitterCard} onChange={(e) => set('twitterCard', e.target.value)}><option>summary_large_image</option><option>summary</option></select></Field>{T('locale', 'Locale', 'e.g. en_IN')}</div>
    <MediaField label="Default share image (1200×630 recommended)" value={v.ogImageMediaId} onChange={(x) => set('ogImageMediaId', x)} />
    <label className="row" style={{ marginBottom: 14 }}><input type="checkbox" checked={v.indexingEnabled} onChange={(e) => set('indexingEnabled', e.target.checked)} /> Allow search engines to index the site</label>
    <h3>Organisation (used in structured data)</h3><JsonForm value={v.organization} onChange={(x) => set('organization', x)} k="" />
    <h3>Structured data to emit</h3><JsonForm value={v.structuredData} onChange={(x) => set('structuredData', x)} k="" /><h3>Recommended lengths</h3><JsonForm value={v.limits} onChange={(x) => set('limits', x)} k="" />
    {can('seo.write') && <div className="sticky-bar"><button className="btn pri" disabled={!g} onClick={async () => { try { await put('/seo/global', g); toast.ok('SEO settings saved'); setG(null); l.reload(); } catch (e) { toast.err(e); } }}>Save global SEO</button></div>}</div>;
}
export function Items({ type }: { type: 'page' | 'product' | 'category' | 'policy' }) {
  const [q, setQ] = useState(''); const l = useLoad(() => get('/seo/items' + qs({ type, q })), [q]); const [key, setKey] = useState<string | null>(null);
  return <><input style={{ marginBottom: 12 }} placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
    {!l.data ? <Loading error={l.error} /> : <div className="card tw"><table><thead><tr><th>Item</th><th>Status</th><th>Title</th><th>Description</th><th>SEO</th><th /></tr></thead><tbody>{l.data.map((r: any) => <tr key={r.key}><td><b>{r.name}</b><div className="hint">{r.key}</div></td><td><Status s={r.status} /></td><td style={{ maxWidth: 240 }}>{r.title ?? '—'}</td><td style={{ maxWidth: 280 }}>{r.description ?? '—'}</td>
      <td>{r.complete ? <Badge kind="ok">Complete</Badge> : r.status !== 'published' ? <Badge>Draft</Badge> : <Badge kind="warn">Missing {r.missing.join(', ')}</Badge>}{r.hasOverride && <> <Badge kind="pri">custom</Badge></>}</td><td><button className="btn sm" onClick={() => setKey(r.key)}>Edit</button></td></tr>)}</tbody></table></div>}
    {key && <ItemEdit type={type} k={key} onClose={() => setKey(null)} onSaved={l.reload} />}</>;
}
const F: [string, string][] = [['metaTitle', 'Meta title'], ['metaDescription', 'Meta description'], ['canonicalUrl', 'Canonical URL (blank = automatic)'], ['robots', 'Robots (blank = default)'], ['ogTitle', 'Open Graph title'], ['ogDescription', 'Open Graph description'], ['ogType', 'Open Graph type'], ['twitterTitle', 'Twitter title'], ['twitterDescription', 'Twitter description']];
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
export function ItemEdit({ type, k, onClose, onSaved }: { type: string; k: string; onClose: () => void; onSaved: () => void }) {
  const { can } = useAuth(); const toast = useToast(); const d = useLoad(() => get('/seo/item' + qs({ type, key: k })), [type, k]); const [f, setF] = useState<any>(null);
  if (!d.data) return <Modal title="SEO" onClose={onClose}><Loading error={d.error} /></Modal>;
  const o: any = d.data.override ?? {}; const r = d.data.resolved; const g = d.data.global;
  const v = f ?? { ...Object.fromEntries(F.map(([n]) => [n, o[snake(n)] ?? ''])), ogImageMediaId: o.og_image_media_id ?? null, twitterImageMediaId: o.twitter_image_media_id ?? null, twitterCard: o.twitter_card ?? '', includeInSitemap: o.include_in_sitemap !== 0 };
  const set = (n: string, x: any) => setF({ ...v, [n]: x }); const len = (s: string, max: number) => <span style={{ color: s.length > max ? 'var(--warn)' : 'var(--mut)' }}> {s.length}/{max}</span>;
  const tl = (v.metaTitle || r?.title || '') as string, dsc = (v.metaDescription || r?.description || '') as string;
  const meter = (s: string, lo: number, hi: number) => { const n = s.length; const c = !n ? 'var(--mut)' : n > hi ? '#d6453a' : n < lo ? '#d98b0b' : '#1c9a4f'; return <div style={{ marginTop: 6 }}><div className="prog"><i style={{ width: Math.min(100, (n / hi) * 100) + '%', background: c }} /></div><small style={{ color: c, fontWeight: 600 }}>{n}/{hi} characters</small></div>; };
  const save = async () => { const b: any = {}; for (const [n] of F) b[n] = v[n] || null; b.ogImageMediaId = v.ogImageMediaId; b.twitterImageMediaId = v.twitterImageMediaId; b.twitterCard = v.twitterCard || null; b.includeInSitemap = v.includeInSitemap; try { await put('/seo/item' + qs({ type, key: k }), b); toast.ok('Saved'); setF(null); d.reload(); onSaved(); } catch (e) { toast.err(e); } };
  const Sec = ({ t, s, children }: { t: string; s?: string; children: React.ReactNode }) => <section style={{ border: '1px solid var(--line)', borderRadius: 16, padding: '16px 18px', marginBottom: 14, background: '#fff' }}><div style={{ marginBottom: 12 }}><b style={{ fontSize: 15 }}>{t}</b>{s && <div className="hint" style={{ margin: '2px 0 0' }}>{s}</div>}</div>{children}</section>;
  const fld = (n: string, label: string, ph = '') => <Field label={label}><input value={v[n]} placeholder={ph} onChange={(e) => set(n, e.target.value)} /></Field>;
  return <Modal title={`SEO — ${k}`} size="xl" onClose={onClose} footer={can('seo.write') ? <><button className="btn" onClick={onClose}>Close</button><button className="btn pri" disabled={!f} onClick={save}>Save changes</button></> : undefined}>
    <div style={{ border: '1px solid var(--line)', borderRadius: 16, padding: '16px 20px', marginBottom: 14, background: 'linear-gradient(180deg,#fff,#f6f9f7)' }}>
      <div className="hint" style={{ margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>Google preview {f ? '· unsaved' : ''}</div>
      <div style={{ fontSize: 12.5, color: '#4d5156', marginBottom: 2 }}>{r?.canonical}</div>
      <div style={{ color: '#1a0dab', fontSize: 20, lineHeight: 1.3, marginBottom: 3 }}>{tl.slice(0, 66) || 'Untitled'}{tl.length > 66 ? '…' : ''}</div>
      <div style={{ color: '#4d5156', fontSize: 14, lineHeight: 1.5 }}>{dsc.slice(0, 165)}{dsc.length > 165 ? '…' : ''}</div></div>
    <Sec t="Search result" s="Leave blank to use the automatic title and description.">
      <Field label="Meta title"><input value={v.metaTitle} placeholder={r?.title} onChange={(e) => set('metaTitle', e.target.value)} />{meter(v.metaTitle, 30, g.limits.titleMax)}</Field>
      <Field label="Meta description"><textarea rows={3} value={v.metaDescription} placeholder={r?.description} onChange={(e) => set('metaDescription', e.target.value)} />{meter(v.metaDescription, 70, g.limits.descriptionMax)}</Field></Sec>
    <Sec t="Social sharing" s="How the link looks on WhatsApp, Facebook, LinkedIn and X.">
      <div className="grid g2">{fld('ogTitle', 'Open Graph title')}{fld('ogType', 'Open Graph type', 'website')}</div>
      <Field label="Open Graph description"><textarea rows={2} value={v.ogDescription} onChange={(e) => set('ogDescription', e.target.value)} /></Field>
      <div className="grid g2">{fld('twitterTitle', 'Twitter title')}<Field label="Twitter card"><select value={v.twitterCard} onChange={(e) => set('twitterCard', e.target.value)}><option value="">Default</option><option>summary_large_image</option><option>summary</option></select></Field></div>
      <Field label="Twitter description"><textarea rows={2} value={v.twitterDescription} onChange={(e) => set('twitterDescription', e.target.value)} /></Field>
      <div className="grid g2"><MediaField label="Open Graph image" value={v.ogImageMediaId} onChange={(x) => set('ogImageMediaId', x)} /><MediaField label="Twitter image" value={v.twitterImageMediaId} onChange={(x) => set('twitterImageMediaId', x)} /></div></Sec>
    <Sec t="Indexing" s="Advanced. Leave blank unless you know you need it.">
      <div className="grid g2">{fld('canonicalUrl', 'Canonical URL', 'Automatic')}{fld('robots', 'Robots', 'index, follow')}</div>
      <label className="row" style={{ marginTop: 6 }}><input type="checkbox" checked={v.includeInSitemap} onChange={(e) => set('includeInSitemap', e.target.checked)} /> Include in sitemap</label></Sec>
  </Modal>;
}
export function Robots() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/seo/robots'), []); const [c, setC] = useState<any>(null); const [pv, setPv] = useState<string | null>(null);
  if (!l.data) return <Loading error={l.error} />; const v = c ?? l.data.config;
  const rules = v.rules.map((r: any) => ({ ...r, allow: r.allow.join('\n'), disallow: r.disallow.join('\n') })); const setRules = (rs: any[]) => setC({ ...v, rules: rs.map((r) => ({ userAgent: r.userAgent, allow: r.allow.split('\n').map((s: string) => s.trim()).filter(Boolean), disallow: r.disallow.split('\n').map((s: string) => s.trim()).filter(Boolean) })) });
  return <div className="grid g2" style={{ alignItems: 'start' }}><div className="card">{rules.map((r: any, i: number) => <div className="item" key={i} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 10 }}><Field label="User-agent"><input value={r.userAgent} onChange={(e) => setRules(rules.map((x: any, j: number) => (j === i ? { ...x, userAgent: e.target.value } : x)))} /></Field>
      <div className="grid g2"><Field label="Allow (one per line)"><textarea value={r.allow} onChange={(e) => setRules(rules.map((x: any, j: number) => (j === i ? { ...x, allow: e.target.value } : x)))} /></Field><Field label="Disallow (one per line)"><textarea value={r.disallow} onChange={(e) => setRules(rules.map((x: any, j: number) => (j === i ? { ...x, disallow: e.target.value } : x)))} /></Field></div>
      {rules.length > 1 && <button className="btn sm dng" onClick={() => setRules(rules.filter((_: any, j: number) => j !== i))}>Remove rule</button>}</div>)}
    <button className="btn sm" onClick={() => setRules([...rules, { userAgent: '', allow: '', disallow: '' }])}>+ Add rule</button>
    <Field label="Extra sitemap URLs (one per line, https)"><textarea value={v.extraSitemaps.join('\n')} onChange={(e) => setC({ ...v, extraSitemaps: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} /></Field><Field label="Custom lines (advanced)"><textarea value={v.customLines} onChange={(e) => setC({ ...v, customLines: e.target.value })} /></Field>
    <div className="row"><button className="btn" onClick={async () => { try { setPv((await post('/seo/robots/preview', v)).preview); } catch (e) { toast.err(e); } }}>Preview</button>{can('seo.write') && <button className="btn pri" disabled={!c} onClick={async () => { try { await put('/seo/robots', c); toast.ok('Saved'); setC(null); setPv(null); l.reload(); } catch (e) { toast.err(e); } }}>Save robots.txt</button>}</div></div>
    <div className="card"><h3>{pv ? 'Preview (unsaved)' : 'Live robots.txt'}</h3><pre className="code">{pv ?? l.data.preview}</pre></div></div>;
}
const FREQS = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
const PRIOS = ['1', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.3', '0.2', '0.1', '0'];
const GLABEL: Record<string, string> = { home: 'Home page', page: 'Other pages', category: 'Categories', collection: 'Collections', product: 'Products', policy: 'Policies', custom: 'Custom' };
export function Sitemap() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/seo/sitemap-config'), []);
  const [cfg, setCfg] = useState<any>(null); const [q, setQ] = useState(''); const [grp, setGrp] = useState(''); const [lim, setLim] = useState(100); const [busy, setBusy] = useState(false); const [np, setNp] = useState('');
  if (!l.data) return <Loading error={l.error} />;
  const c = cfg ?? l.data.config; const wr = can('seo.write'); const base = String(l.data.entries[0]?.url ?? '').replace(/^(https?:\/\/[^/]+).*$/, '$1');
  const upd = (fn: (x: any) => void) => { const n = JSON.parse(JSON.stringify(c)); fn(n); setCfg(n); };
  const eff = (e: any) => { const o = c.overrides[e.path]; const g = c.groups[e.group] ?? {}; return { p: o?.priority ?? (e.group === 'custom' ? e.priority : g.priority), f: o?.changefreq ?? (e.group === 'custom' ? e.changeFrequency : g.changefreq) }; };
  const rows = l.data.entries.filter((e: any) => (!grp || e.group === grp) && (!q || e.path.toLowerCase().includes(q.toLowerCase())) && !c.overrides[e.path]?.exclude);
  const excluded = Object.entries(c.overrides).filter(([, o]: any) => o.exclude).map(([p]) => p);
  const setO = (path: string, k: string, v: any) => upd((n) => { n.overrides[path] = { ...(n.overrides[path] ?? {}), [k]: v }; });
  const save = async () => { setBusy(true); try { await put('/seo/sitemap-config', c); toast.ok('Sitemap saved'); setCfg(null); l.reload(); } catch (e) { toast.err(e); } setBusy(false); };
  const sel = (v: any, on: (x: string) => void, opts: string[]) => <select disabled={!wr} value={String(v)} onChange={(e) => on(e.target.value)} style={{ width: 96 }}>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
  return <div className="stack">
    <div className="card"><div className="row" style={{ justifyContent: 'space-between' }}><div><h3 style={{ margin: 0 }}>Sitemap priorities</h3><p className="mut" style={{ margin: '4px 0 0' }}><b>{l.data.entries.length}</b> URLs. Set a default per type below, then fine-tune single pages in the list. Search engines treat priority as a hint, not a command.</p></div>
      <a className="btn" href={base + '/sitemap.xml'} target="_blank" rel="noreferrer">Open sitemap.xml ↗</a></div>
      <div className="tw" style={{ marginTop: 12 }}><table><thead><tr><th>Type</th><th>Default priority</th><th>Change frequency</th></tr></thead><tbody>{Object.keys(c.groups).map((g) => <tr key={g}><td><b>{GLABEL[g] ?? g}</b></td><td>{sel(c.groups[g].priority, (v) => upd((n) => { n.groups[g].priority = Number(v); }), PRIOS)}</td><td>{sel(c.groups[g].changefreq, (v) => upd((n) => { n.groups[g].changefreq = v; }), FREQS)}</td></tr>)}</tbody></table></div></div>
    <div className="card"><div className="row" style={{ marginBottom: 10, gap: 8, flexWrap: 'wrap' }}><input placeholder="Search URL…" value={q} onChange={(e) => { setQ(e.target.value); setLim(100); }} style={{ maxWidth: 260 }} />
      <select value={grp} onChange={(e) => { setGrp(e.target.value); setLim(100); }} style={{ width: 160 }}><option value="">All types</option>{[...Object.keys(c.groups), 'custom'].map((g) => <option key={g} value={g}>{GLABEL[g] ?? g}</option>)}</select><span className="mut">{rows.length} shown</span></div>
      <div className="tw"><table><thead><tr><th>URL</th><th>Type</th><th>Priority</th><th>Frequency</th><th></th></tr></thead><tbody>{rows.slice(0, lim).map((e: any) => { const x = eff(e); const o = c.overrides[e.path]; return <tr key={e.path}><td style={{ wordBreak: 'break-all' }}>{e.path}{o && (o.priority != null || o.changefreq) ? <Badge kind="pri">custom</Badge> : null}</td><td>{GLABEL[e.group] ?? e.group}</td>
        <td>{sel(x.p, (v) => setO(e.path, 'priority', Number(v)), PRIOS)}</td><td>{sel(x.f, (v) => setO(e.path, 'changefreq', v), FREQS)}</td>
        <td style={{ whiteSpace: 'nowrap' }}>{wr && <>{o && (o.priority != null || o.changefreq) && <button className="btn sm" onClick={() => upd((n) => { delete n.overrides[e.path].priority; delete n.overrides[e.path].changefreq; if (!Object.keys(n.overrides[e.path]).length) delete n.overrides[e.path]; })}>Reset</button>} <button className="btn sm" onClick={() => upd((n) => { if (e.group === 'custom') n.extra = n.extra.filter((z: any) => z.path !== e.path); else n.overrides[e.path] = { ...(n.overrides[e.path] ?? {}), exclude: true }; })}>{e.group === 'custom' ? 'Remove' : 'Exclude'}</button></>}</td></tr>; })}</tbody></table></div>
      {rows.length > lim && <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={() => setLim(lim + 200)}>Show more</button></div>}</div>
    {excluded.length > 0 && <div className="card"><h3>Excluded from sitemap</h3>{excluded.map((p) => <div key={p} className="row" style={{ justifyContent: 'space-between', padding: '4px 0' }}><span style={{ wordBreak: 'break-all' }}>{p}</span>{wr && <button className="btn sm" onClick={() => upd((n) => { delete n.overrides[p].exclude; if (!Object.keys(n.overrides[p]).length) delete n.overrides[p]; })}>Include again</button>}</div>)}</div>}
    {wr && <div className="card"><h3>Add a custom URL</h3><p className="mut" style={{ marginTop: 0 }}>For a page that is not generated automatically. Path only, e.g. /blog/guide. It must exist on your site.</p>
      <div className="row" style={{ gap: 8 }}><input placeholder="/path" value={np} onChange={(e) => setNp(e.target.value)} style={{ maxWidth: 320 }} /><button className="btn" onClick={() => { const p = np.trim(); if (!/^\/[^\s#]*$/.test(p)) return toast.err(new Error('Enter a path starting with /')); upd((n) => { if (!n.extra.some((z: any) => z.path === p)) n.extra.push({ path: p, priority: 0.5, changefreq: 'monthly' }); }); setNp(''); }}>Add</button></div></div>}
    {wr && cfg && <div className="sticky-bar"><button className="btn pri" disabled={busy} onClick={save}>Save sitemap</button> <button className="btn" onClick={() => setCfg(null)}>Discard</button></div>}
  </div>;
}
export function Llms() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/seo/llms'), []); const [c, setC] = useState<any>(null);
  if (!l.data) return <Loading error={l.error} />; const v = c ?? l.data.config;
  return <div className="grid g2" style={{ alignItems: 'start' }}><div className="card"><Alert kind="info">llms.txt is a plain-text guide for AI assistants. It only lists real, published information. Do not put anything here that you would not want public.</Alert><JsonForm value={v} onChange={setC} k="" />
    {can('seo.write') && <div className="sticky-bar"><button className="btn pri" disabled={!c} onClick={async () => { try { await put('/seo/llms', c); toast.ok('Saved'); setC(null); l.reload(); } catch (e) { toast.err(e); } }}>Save llms.txt settings</button></div>}</div>
    <div className="card"><h3>/llms.txt (saved)</h3><pre className="code">{l.data.preview ?? 'Disabled'}</pre><h3>/llms-full.txt (saved)</h3><pre className="code">{l.data.previewFull ?? 'Disabled'}</pre></div></div>;
}
export function JsonLd() {
  const [type, setType] = useState('home'); const [key, setKey] = useState(''); const l = useLoad(() => get('/seo/jsonld-preview' + qs({ type, key })), [type, key]);
  return <div className="card"><div className="row"><select style={{ width: 160 }} value={type} onChange={(e) => setType(e.target.value)}>{['home', 'product', 'page', 'category', 'contact'].map((t) => <option key={t}>{t}</option>)}</select><input style={{ width: 260 }} placeholder="slug (for product / page / category)" value={key} onChange={(e) => setKey(e.target.value)} /></div>
    <p className="hint">This is exactly what the storefront outputs. FAQPage data appears only when the page really shows those FAQs; ratings only when enabled on the product.</p>{!l.data ? <Loading error={l.error} /> : <pre className="code">{JSON.stringify(l.data, null, 2)}</pre>}</div>;
}
export function Report() {
  const l = useLoad(() => get('/seo/report'), []);
  if (!l.data) return <Loading error={l.error} />; const d = l.data;
  return <><div className="row" style={{ marginBottom: 12 }}><Badge kind={d.counts.error ? 'err' : 'ok'}>{d.counts.error} errors</Badge><Badge kind={d.counts.warning ? 'warn' : 'ok'}>{d.counts.warning} warnings</Badge><span className="hint">{d.counts.entities} items · {d.counts.sitemapUrls} sitemap URLs · generated {when(d.generatedAt)}</span><button className="btn sm" onClick={l.reload}>Re-run</button></div>
    {!d.issues.length ? <Alert kind="ok">No SEO issues found.</Alert> : <div className="card tw"><table><thead><tr><th>Level</th><th>Check</th><th>Where</th><th>Problem</th></tr></thead><tbody>{d.issues.map((i: any, n: number) => <tr key={n}><td><Badge kind={i.level === 'error' ? 'err' : i.level === 'warning' ? 'warn' : 'pri'}>{i.level}</Badge></td><td>{i.check}</td><td>{i.where}</td><td>{i.message}</td></tr>)}</tbody></table></div>}</>;
}
function Redirects() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/redirects'), []); const [f, setF] = useState({ fromPath: '', toPath: '', statusCode: 301 });
  return <><div className="card"><h3>Add redirect</h3><div className="row"><input style={{ flex: 1 }} placeholder="/old-path" value={f.fromPath} onChange={(e) => setF({ ...f, fromPath: e.target.value })} /><span>→</span><input style={{ flex: 1 }} placeholder="/new-path or https://…" value={f.toPath} onChange={(e) => setF({ ...f, toPath: e.target.value })} />
    <select style={{ width: 110 }} value={f.statusCode} onChange={(e) => setF({ ...f, statusCode: Number(e.target.value) })}><option value={301}>301 permanent</option><option value={302}>302 temporary</option></select>
    {can('seo.write') && <button className="btn pri" onClick={async () => { try { await post('/redirects', f); toast.ok('Redirect saved'); setF({ fromPath: '', toPath: '', statusCode: 301 }); l.reload(); } catch (e) { toast.err(e); } }}>Add</button>}</div><p className="hint">Loops and chains are rejected. Live within about a minute.</p></div>
    {!l.data ? <Loading error={l.error} /> : <div className="card tw"><table><thead><tr><th>From</th><th>To</th><th>Type</th><th /></tr></thead><tbody>{l.data.map((r: any) => <tr key={r.id}><td>{r.from_path}</td><td>{r.to_path}</td><td>{r.status_code}</td><td>{can('seo.write') && <button className="btn sm dng" onClick={async () => { if (!await askConfirm('Remove redirect?')) return; try { await del('/redirects/' + r.id); l.reload(); } catch (e) { toast.err(e); } }}>Remove</button>}</td></tr>)}</tbody></table></div>}</>;
}
export function Revisions() {
  const l = useLoad(() => get('/seo/revisions'), []); const [sel, setSel] = useState<any>(null);
  if (!l.data) return <Loading error={l.error} />;
  return <div className="card tw"><p className="hint">Each save keeps the previous values here (read-only history).</p><table><thead><tr><th>When</th><th>Scope</th><th>By</th><th /></tr></thead><tbody>{l.data.map((r: any) => <tr key={r.id}><td>{when(r.created_at)}</td><td>{r.scope}</td><td>{r.admin ?? '—'}</td><td><button className="btn sm" onClick={() => setSel(r)}>View previous values</button></td></tr>)}</tbody></table>
    {sel && <Modal title={`${sel.scope} — ${when(sel.created_at)}`} size="lg" onClose={() => setSel(null)}><pre className="code">{JSON.stringify(typeof sel.snapshot === 'string' ? JSON.parse(sel.snapshot) : sel.snapshot, null, 2)}</pre></Modal>}</div>;
}

function CopyUrl({ url }: { url: string }) {
  const toast = useToast();
  return <div className="copyurl"><code>{url}</code><button className="btn sm" onClick={() => { navigator.clipboard?.writeText(url); toast.ok('Copied'); }}>Copy</button></div>;
}
export function Webmaster() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/seo/global'), []); const [w, setW] = useState<any>(null); const [busy, setBusy] = useState(false);
  if (!l.data) return <Loading error={l.error} />;
  const cur = w ?? { googleVerification: '', bingVerification: '', merchantVerification: '', businessProfileUrl: '', reviewUrl: '', mapsUrl: '', ...(l.data.webmaster ?? {}) };
  const set = (k: string, v: string) => setW({ ...cur, [k]: v });
  const base = String(l.data.baseUrl || '').replace(/\/$/, ''); const wr = can('seo.write');
  const save = async () => { setBusy(true); try { await put('/seo/global', { webmaster: cur }); toast.ok('Webmaster settings saved'); setW(null); l.reload(); } catch (e) { toast.err(e); } setBusy(false); };
  return <>
    <div className="card"><h2>Google Search Console</h2><p className="hint">Search Console → Settings → Ownership verification → <b>HTML tag</b>. Paste the whole tag or just the code from <code>content="…"</code>.</p>
      <Field label="Verification code"><input disabled={!wr} value={cur.googleVerification} onChange={(e) => set('googleVerification', e.target.value)} placeholder='e.g. abc123XYZ… or the full <meta name="google-site-verification" …> tag' /></Field>
      <div className="hint" style={{ margin: '8px 0 4px' }}>After verifying, submit your sitemap in Search Console:</div><CopyUrl url={base + '/sitemap.xml'} /></div>

    <div className="card"><h2>Bing Webmaster Tools</h2><p className="hint">Bing Webmaster → Add site → verify with <b>HTML meta tag</b>. Paste the tag or just the <code>content</code> value. Bing can also import your site straight from Search Console.</p>
      <Field label="Verification code (msvalidate.01)"><input disabled={!wr} value={cur.bingVerification} onChange={(e) => set('bingVerification', e.target.value)} /></Field></div>

    <div className="card"><h2>Google Merchant Center</h2><p className="hint">Free product listings on Google Shopping. Verify and claim your website in Merchant Center (Settings → Business info → Website), then add the product feed below as a scheduled fetch.</p>
      <Field label="Merchant Center verification code" hint="Only needed if Merchant Center gives you a different code from Search Console. If your Search Console is already verified, you can leave this empty."><input disabled={!wr} value={cur.merchantVerification} onChange={(e) => set('merchantVerification', e.target.value)} /></Field>
      <div className="hint" style={{ margin: '10px 0 4px' }}>Product feed URL (Merchant Center → Products → Feeds → Add feed → Scheduled fetch):</div><CopyUrl url={base + '/feeds/google-merchant.xml'} />
      <p className="hint" style={{ marginTop: 8 }}>The feed updates itself from your live products every 15 minutes (title, price, sale price, stock, image, brand, model, condition). Products without an image or price are skipped.</p></div>

    <div className="card"><h2>Google Business Profile</h2><p className="hint">Helps Google connect your website with your Business Profile. These links are added to your site's structured data (Organization → sameAs).</p>
      <div className="grid g2"><Field label="Business Profile / Google Maps link"><input disabled={!wr} value={cur.businessProfileUrl} onChange={(e) => set('businessProfileUrl', e.target.value)} placeholder="https://g.page/your-business" /></Field><Field label="Maps directions link (optional)"><input disabled={!wr} value={cur.mapsUrl} onChange={(e) => set('mapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/…" /></Field>
        <Field label="“Write a review” link (optional)" hint="Business Profile → Get more reviews → copy link. Use it in order emails and WhatsApp."><input disabled={!wr} value={cur.reviewUrl} onChange={(e) => set('reviewUrl', e.target.value)} placeholder="https://g.page/r/…/review" /></Field></div></div>

    <Tags />

    {wr && <div className="sticky-bar"><button className="btn pri" disabled={busy || !w} onClick={save}>{busy ? 'Saving…' : 'Save webmaster settings'}</button></div>}
  </>;
}

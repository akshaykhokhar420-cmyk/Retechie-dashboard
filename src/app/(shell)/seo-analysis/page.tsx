'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { get, post, put, del, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Tabs, Alert, Badge, useLoad, Loading, Empty, Field } from '@/components/ui';
import { useConfirm } from '@/components/Confirm';
import { Global, Webmaster, Items, ItemEdit, Robots, Sitemap, Llms, JsonLd, Report, Revisions } from '@/components/seo/Legacy';
import { Overview as HealthOverview, Pages, Ips, Log, Errors, Refs, Kpi, tone, short } from '@/components/seo/Health';

type Tab = 'live' | 'focus' | 'social' | 'unused' | 'dash' | 'analytics' | 'gsc' | 'audit' | 'crawl' | 'keywords' | 'redir' | 'broken' | 'sitemap' | 'robots' | 'schema' | 'ai' | 'reports' | 'integrations' | 'logs' | 'settings';
const TABS: [Tab, string][] = [['dash', 'Overview'], ['analytics', 'Analytics'], ['gsc', 'Search Console'], ['audit', 'Technical audit'], ['live', 'Live technical check'], ['crawl', 'Crawl & indexability'], ['keywords', 'Keywords'], ['focus', 'Focus keywords'], ['social', 'Social previews'], ['unused', 'Unused media'], ['redir', 'Redirects'], ['broken', '404 & broken links'], ['sitemap', 'Sitemaps'], ['robots', 'Robots & crawling'], ['schema', 'Schema validation'], ['ai', 'AI search readiness'], ['reports', 'Reports'], ['integrations', 'Integrations'], ['logs', 'Activity logs'], ['settings', 'Settings']];
const PL: Record<string, string> = { page: 'pages', product: 'products', category: 'categories', policy: 'policies' };
const Sub = ({ items, v, on }: { items: [string, string][]; v: string; on: (k: string) => void }) => <div className="row" style={{ marginBottom: 14 }}>{items.map(([k, l]) => <button key={k} className={'btn sm ' + (v === k ? 'pri' : '')} onClick={() => on(k)}>{l}</button>)}</div>;

export default function SeoAnalysis() {
  const { can } = useAuth(); const toast = useToast(); const [tab, setTab] = useState<Tab>('dash');
  useEffect(() => { const h = () => { const x = (location.hash.slice(1) || 'dash') as Tab; if (TABS.some(([k]) => k === x)) setTab(x); }; h(); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  const go = (t: Tab) => { setTab(t); try { history.replaceState(null, '', '#' + t); } catch { /* ignore */ } };
  const audit = useLoad(() => get('/seo-health/audit'), []); const running = !!audit.data?.running;
  useEffect(() => { if (!running) return; const t = setInterval(audit.reload, 2000); return () => clearInterval(t); }, [running]); // eslint-disable-line
  const start = async () => { try { await post('/seo-health/audit'); toast.ok('Audit started — crawling every page'); audit.reload(); } catch (e) { toast.err(e); } };
  const a = audit.data;
  return <><PageHead title="SEO Analysis" sub="Technical SEO, indexability, redirects, sitemaps, robots, schema, search integrations and traffic quality.">
    {can('seo.write') && <button className="btn pri" disabled={running} onClick={start}>{running ? `Auditing… ${a?.done}/${a?.total}` : 'Run full site audit'}</button>}</PageHead>
    {running && <div className="prog" style={{ margin: '0 0 14px' }}><i style={{ width: `${((a?.done || 0) / Math.max(1, a?.total || 1)) * 100}%` }} /></div>}
    <h2 style={{ margin: '0 0 14px', fontSize: 18 }}>{TABS.find(([k]) => k === tab)?.[1]}</h2>
    {tab === 'dash' && <Dash go={go} />}
    {tab === 'analytics' && <><Ga4 /><Traffic /></>}
    {tab === 'gsc' && <Gsc />}
    {tab === 'audit' && <Issues />}
    {tab === 'live' && <LiveTech />}{tab === 'focus' && <FocusKeywords />}{tab === 'social' && <Social />}{tab === 'unused' && <Unused />}
    {tab === 'crawl' && <Crawl a={a} />}
    {tab === 'keywords' && <Keywords />}
    {tab === 'redir' && <><RedirHealth /><Redirections /></>}
    {tab === 'broken' && <><Errors a={a} /><NotFound /></>}
    {tab === 'sitemap' && <Sitemap />}
    {tab === 'robots' && <Robots />}
    {tab === 'schema' && <><JsonLd /><Report /></>}
    {tab === 'ai' && <Llms />}
    {tab === 'reports' && <Emails />}
    {tab === 'integrations' && <Integrations />}
    {tab === 'logs' && <Logs />}
    {tab === 'settings' && <SettingsTab />}
  </>;
}

/* ---------------- Overview ---------------- */
function Dash({ go }: { go: (t: Tab) => void }) {
  const d = useLoad(() => get('/seo-master/dashboard'), []); const [edit, setEdit] = useState<any>(null); const [more, setMore] = useState(20);
  if (!d.data) return <Loading error={d.error} />; const x = d.data; const o = x.issues.open;
  return <>
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
      <Kpi l="Open errors" v={o.error} c={o.error ? '#d6453a' : '#1c9a4f'} sub="Technical audit" />
      <Kpi l="Open warnings" v={o.warning} c={o.warning ? '#d98b0b' : '#1c9a4f'} sub={`${o.notice} notices`} />
      <Kpi l="Site audit score" v={x.audit?.score ?? '—'} c={x.audit?.score != null ? tone(x.audit.score) : undefined} sub={x.audit?.at ? when(x.audit.at) : 'not run yet'} />
      <Kpi l="Real visitors (7 days)" v={x.traffic.human} sub={`${x.traffic.errors404} 404s · ${x.traffic.errorsJs} JS errors`} />
      <Kpi l="Spam / bot share" v={x.traffic.spamShare + '%'} c={x.traffic.spamShare > 25 ? '#d6453a' : x.traffic.spamShare > 10 ? '#d98b0b' : '#1c9a4f'} sub="last 7 days" />
    </div>
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
      <Kpi l="Indexable pages" v={`${x.coverage.indexable}/${x.total}`} sub="not set to noindex" />
      <Kpi l="With title + description" v={`${Math.min(x.coverage.title, x.coverage.description)}/${x.total}`} sub={`${x.coverage.custom} customised`} />
      <Kpi l="Redirects" v={x.redirects.total} sub={`${x.redirects.hits} total hits`} />
      <Kpi l="Resolved / ignored" v={`${x.issues.resolved} / ${x.issues.ignored}`} sub="issue tracker" />
    </div>
    {!x.audit && <Alert kind="info">No audit yet. Press <b>Run full site audit</b> (top right) to find technical issues.</Alert>}
    {o.error > 0 && <Alert kind="warn">{o.error} error(s) need attention. <button className="btn sm" onClick={() => go('audit')}>Open technical audit</button></Alert>}
    <Alert kind="info">Search Console and GA4 data appear only after you connect them in <button className="btn sm" onClick={() => go('integrations')}>Integrations</button>. Nothing is estimated.</Alert>
    {x.items.length > 0 && <><h2 style={{ margin: '14px 0 8px' }}>Metadata gaps</h2><div className="card tw"><table><thead><tr><th>Page</th><th>Meta title</th><th>Gaps</th><th /></tr></thead><tbody>{x.items.slice(0, more).map((i: any) => <tr key={i.type + i.key}>
      <td><b>{short(i.name, 40)}</b><div className="hint" style={{ margin: 0 }}>{i.type} · {i.path}</div></td><td style={{ maxWidth: 280, fontSize: 12.5 }}>{short(i.title || '—', 70)}</td><td style={{ fontSize: 12.5 }}>{i.flags.join(' · ')}</td><td><button className="btn sm" onClick={() => setEdit(i)}>Edit SEO</button></td></tr>)}</tbody></table>
      {x.items.length > more && <div style={{ padding: 12, textAlign: 'center' }}><button className="btn sm" onClick={() => setMore(more + 40)}>Show more ({x.items.length - more} left)</button></div>}</div></>}
    {edit && <ItemEdit type={edit.type} k={edit.key} onClose={() => setEdit(null)} onSaved={() => d.reload()} />}
  </>;
}

/* ---------------- Technical audit: issue tracker ---------------- */
function Issues() {
  const { can } = useAuth(); const toast = useToast(); const [st, setSt] = useState('open'); const [sev, setSev] = useState(''); const [open, setOpen] = useState<number | null>(null);
  const l = useLoad(() => get(`/seo-master/issues?status=${st}&severity=${sev}`), [st, sev]);
  const act = async (id: number, f: () => Promise<any>, ok: string) => { try { const r = await f(); toast.ok(r?.note || ok); l.reload(); } catch (e) { toast.err(e); } };
  return <>
    <div className="row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>{[['open', 'Open'], ['resolved', 'Resolved'], ['ignored', 'Ignored'], ['', 'All']].map(([k, n]) => <button key={k} className={'btn sm ' + (st === k ? 'pri' : '')} onClick={() => setSt(k)}>{n}</button>)}<span style={{ width: 12 }} />{['', 'error', 'warning', 'notice'].map((k) => <button key={k} className={'btn sm ' + (sev === k ? 'pri' : '')} onClick={() => setSev(k)}>{k || 'Any severity'}</button>)}</div>
    {!l.data ? <Loading error={l.error} /> : !l.data.items.length ? <Alert kind="ok">No {st || ''} issues. Run a full site audit to check again.</Alert> :
      <div className="card tw"><table><thead><tr><th>ID</th><th>Severity</th><th>Issue</th><th>URL</th><th>Confidence</th><th>First seen</th><th>Last seen</th><th /></tr></thead><tbody>{l.data.items.map((i: any) => <>
        <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(open === i.id ? null : i.id)}><td>#{i.id}</td><td><span className={'badge ' + ({ error: 'err', warning: 'warn', notice: 'info' } as any)[i.severity]}>{i.severity}</span></td><td>{short(i.message, 70)}</td><td>{short(i.url, 40)}</td><td>{i.confidence}</td><td>{when(i.first_detected)}</td><td>{when(i.last_detected)}</td>
          <td onClick={(e) => e.stopPropagation()}>{can('seo.write') && <div className="row"><button className="btn sm" onClick={() => act(i.id, () => post(`/seo-master/issues/${i.id}/recheck`), 'Rechecked')}>Recheck</button>{i.status === 'ignored' ? <button className="btn sm" onClick={() => act(i.id, () => post(`/seo-master/issues/${i.id}/status`, { status: 'open' }), 'Reopened')}>Reopen</button> : <button className="btn sm" onClick={() => act(i.id, () => post(`/seo-master/issues/${i.id}/status`, { status: 'ignored' }), 'Ignored')}>Ignore</button>}</div>}</td></tr>
        {open === i.id && <tr key={i.id + 'x'}><td colSpan={8} style={{ background: 'var(--line2)' }}><div><b>Evidence:</b> {i.evidence}</div><div style={{ margin: '4px 0' }}><b>How to fix:</b> {i.fix || '—'}</div><div className="hint" style={{ margin: 0 }}>History: {i.history.map((h: any) => `${when(h.at)} ${h.ev}`).join(' → ')}</div></td></tr>}</>)}</tbody></table></div>}
    {can('seo.write') && <><h2 style={{ marginTop: 22 }}>Image alt text</h2><Images /></>}
  </>;
}

/* ---------------- Google (GSC / GA4) ---------------- */
const pct = (n: number) => (n * 100).toFixed(1) + '%';
function useGoogle() { return useLoad(() => get('/seo-master/integrations'), []); }
function Gate({ g, need, children }: { g: any; need: 'gsc' | 'ga4'; children: React.ReactNode }) {
  if (!g.data) return <Loading error={g.error} />;
  const v = g.data[need]; if (v.connected) return <>{children}</>;
  return <div className="card" style={{ maxWidth: 640 }}><h3>{need === 'gsc' ? 'Google Search Console' : 'Google Analytics 4'}: not connected</h3><p className="hint">This data comes straight from Google and is never estimated.</p><Alert kind="info">{v.reason}</Alert><p className="hint">Connect it in the Integrations tab.</p></div>;
}
function GscTable({ dim, days }: { dim: string; days: number }) {
  const r = useLoad(() => get(`/seo-master/gsc/report?dim=${dim}&days=${days}`), [dim, days]); const [q, setQ] = useState('');
  if (!r.data) return <Loading error={r.error} />; if (!r.data.length) return <Empty title="No data for this period" text="Google reports data with a 2–3 day delay, and only for queries with impressions." />;
  const rows = r.data.filter((x: any) => !q || x.key.toLowerCase().includes(q.toLowerCase()));
  return <><input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240, marginBottom: 10 }} /><div className="card tw"><table><thead><tr><th>{dim}</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Avg position</th></tr></thead><tbody>{rows.map((x: any) => <tr key={x.key}><td>{short(x.key, 70)}</td><td><b>{x.clicks}</b></td><td>{x.impressions}</td><td>{pct(x.ctr)}</td><td>{x.position.toFixed(1)}</td></tr>)}</tbody></table></div></>;
}
function Gsc() {
  const g = useGoogle(); const { can } = useAuth(); const toast = useToast(); const [days, setDays] = useState(28); const [dim, setDim] = useState('page'); const [u, setU] = useState(''); const [res, setRes] = useState<any>(null);
  return <Gate g={g} need="gsc"><div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>{[7, 28, 90].map((d) => <button key={d} className={'btn sm ' + (days === d ? 'pri' : '')} onClick={() => setDays(d)}>{d} days</button>)}<span style={{ width: 12 }} />{[['page', 'Pages'], ['date', 'By date'], ['country', 'Countries'], ['device', 'Devices']].map(([k, l]) => <button key={k} className={'btn sm ' + (dim === k ? 'pri' : '')} onClick={() => setDim(k)}>{l}</button>)}
    {can('seo.write') && <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={async () => { try { await post('/seo-master/gsc/sitemap'); toast.ok('Sitemap submitted to Google'); } catch (e) { toast.err(e); } }}>Submit sitemap</button>}</div>
    <GscTable dim={dim} days={days} />
    {can('seo.write') && <><h2 style={{ marginTop: 20 }}>URL inspection</h2><div className="row"><input placeholder="https://yoursite.com/page" value={u} onChange={(e) => setU(e.target.value)} style={{ maxWidth: 420 }} /><button className="btn pri" disabled={!u} onClick={async () => { try { setRes(await post('/seo-master/gsc/inspect', { url: u })); } catch (e) { toast.err(e); } }}>Inspect</button></div>
      {res && <div className="card" style={{ marginTop: 10 }}>{Object.entries(res).map(([k, v]) => <div key={k}><b>{k}:</b> {String(v ?? '—')}</div>)}</div>}</>}
  </Gate>;
}
function Keywords() { const g = useGoogle(); const [days, setDays] = useState(28); return <Gate g={g} need="gsc"><div className="row" style={{ marginBottom: 12 }}>{[7, 28, 90].map((d) => <button key={d} className={'btn sm ' + (days === d ? 'pri' : '')} onClick={() => setDays(d)}>{d} days</button>)}</div><GscTable dim="query" days={days} /></Gate>; }
function Ga4() {
  const g = useGoogle(); if (!g.data?.ga4?.connected) return g.data ? <Alert kind="info">GA4: {g.data.ga4.reason}. Connect it in Integrations to see Google-measured sessions here. The numbers below are first-party.</Alert> : null;
  return <Ga4Inner />;
}
function Ga4Inner() {
  const r = useLoad(() => get('/seo-master/ga4/report?days=28'), []); if (!r.data) return <Loading error={r.error} />;
  return <><h2 style={{ margin: '0 0 8px' }}>GA4 · last 28 days</h2><div className="card tw" style={{ marginBottom: 18 }}><table><thead><tr><th>Channel</th><th>Sessions</th><th>Users</th><th>Engagement</th></tr></thead><tbody>{r.data.map((x: any) => <tr key={x.channel}><td>{x.channel}</td><td><b>{x.sessions}</b></td><td>{x.users}</td><td>{pct(x.engagement)}</td></tr>)}</tbody></table></div></>;
}
function Integrations() {
  const g = useGoogle(); const { can } = useAuth(); const toast = useToast(); const sites = useLoad(() => (g.data?.connected ? get('/seo-master/google/sites').catch(() => []) : Promise.resolve([])), [g.data?.connected]); const props = useLoad(() => (g.data?.connected ? get('/seo-master/google/properties').catch(() => []) : Promise.resolve([])), [g.data?.connected]);
  useEffect(() => { const q = location.search; if (q.includes('google=ok')) toast.ok('Google connected'); else if (q.includes('google=failed')) toast.err(new Error('Google connection failed. Try again.')); }, []); // eslint-disable-line
  if (!g.data) return <Loading error={g.error} />; const d = g.data;
  const pick = async (body: any) => { try { await post('/seo-master/google/select', body); toast.ok('Saved'); g.reload(); } catch (e) { toast.err(e); } };
  return <div className="row2">
    <div className="wd l"><h3>Google account</h3><span className={'badge ' + (d.connected ? 'ok' : 'warn')}>{d.connected ? 'Connected' : d.configured ? 'Awaiting authorization' : 'Not configured'}</span>
      {!d.configured && <p className="hint">Create a Google Cloud OAuth client (Web application). Add <b>GOOGLE_CLIENT_ID</b> and <b>GOOGLE_CLIENT_SECRET</b> to the backend environment variables, and this redirect URI in Google Cloud:<br /><code>{d.redirectUri}</code><br />Enable the Search Console API, URL Inspection (Search Console) API, Google Analytics Data API and Analytics Admin API.</p>}
      {can('seo.write') && d.configured && !d.connected && <button className="btn pri" onClick={async () => { try { const r = await get('/seo-master/google/auth-url'); location.href = r.url; } catch (e) { toast.err(e); } }}>Connect Google</button>}
      {can('seo.write') && d.connected && <button className="btn" onClick={async () => { try { await post('/seo-master/google/disconnect'); toast.ok('Disconnected'); g.reload(); } catch (e) { toast.err(e); } }}>Disconnect</button>}
      {d.connectedAt && <p className="hint">Connected {when(d.connectedAt)}</p>}</div>
    <div className="wd l"><h3>Search Console property</h3>{!d.connected ? <p className="hint">Connect Google first.</p> : <select value={d.gscSite || ''} onChange={(e) => pick({ gscSite: e.target.value })}><option value="">Choose…</option>{(sites.data || []).map((s: any) => <option key={s.site} value={s.site}>{s.site}</option>)}</select>}</div>
    <div className="wd l"><h3>GA4 property</h3>{!d.connected ? <p className="hint">Connect Google first.</p> : <select value={d.ga4Property || ''} onChange={(e) => pick({ ga4Property: e.target.value })}><option value="">Choose…</option>{(props.data || []).map((p: any) => <option key={p.property} value={p.property}>{p.name}</option>)}</select>}</div>
  </div>;
}
function RedirHealth() {
  const h = useLoad(() => get('/seo-master/redirects/health'), []); if (!h.data) return null; if (!h.data.length) return <Alert kind="ok">No redirect chains or loops.</Alert>;
  return <><Alert kind="warn">{h.data.length} redirect problem(s): chains slow crawlers, loops break the page.</Alert><div className="card tw" style={{ marginBottom: 14 }}><table><tbody>{h.data.map((x: any) => <tr key={x.from}><td><span className={'badge ' + (x.kind === 'loop' ? 'err' : 'warn')}>{x.kind}</span></td><td>{x.path.join(' → ')}</td></tr>)}</tbody></table></div></>;
}
function Logs() {
  const l = useLoad(() => get('/seo-master/activity'), []); if (!l.data) return <Loading error={l.error} />; if (!l.data.length) return <Empty title="No activity yet" />;
  return <div className="card tw"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Items</th><th>Detail</th></tr></thead><tbody>{l.data.map((o: any) => <tr key={o.id}><td>{when(o.ts)}</td><td>{o.admin}</td><td><b>{o.action.replace(/_/g, ' ')}</b></td><td>{o.affected}</td><td>{o.detail}</td></tr>)}</tbody></table></div>;
}
function NotFound() { return <div style={{ marginTop: 18 }}><Redirections only404 /></div>; }

/* ---------------- Bulk operations ---------------- */
function parseCsv(txt: string) {
  const rows: string[][] = []; let cur: string[] = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) { const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { cur.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; cur.push(f); f = ''; if (cur.some((x) => x !== '')) rows.push(cur); cur = []; } else f += c; }
  if (f || cur.length) { cur.push(f); rows.push(cur); } const h = (rows.shift() || []).map((x) => x.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}
const csvCell = (v: any) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function Bulk() {
  const toast = useToast(); const { can } = useAuth(); const [types, setTypes] = useState<string[]>(['product', 'category', 'page', 'policy']); const [over, setOver] = useState(false); const [busy, setBusy] = useState(false); const [robots, setRobots] = useState('index,follow'); const [conf, setConf] = useState(''); const file = useRef<HTMLInputElement>(null);
  const log = useLoad(() => get('/seo-master/dashboard'), []);
  const run = async (action: string, extra: any = {}) => { if (!types.length) return toast.err(new Error('Pick at least one content type')); setBusy(true); try { const r = await post('/seo-master/bulk', { action, types, overwrite: over, ...extra }); toast.ok(`${r.affected} item(s) updated`); log.reload(); } catch (e) { toast.err(e); } finally { setBusy(false); } };
  const exp = async () => { const rows: any[] = await get('/seo-master/export'); const h = ['type', 'key', 'name', 'meta_title', 'meta_description', 'robots', 'canonical_url']; const blob = new Blob([[h.join(','), ...rows.map((r) => h.map((k) => csvCell(r[k])).join(','))].join('\n')], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'retechie-seo.csv'; a.click(); };
  const imp = async (f?: File | null) => { if (!f) return; const rows = parseCsv(await f.text()); if (!rows.length) return toast.err(new Error('The CSV has no rows')); setBusy(true); try { const r = await post('/seo-master/import', { rows }); toast.ok(`Imported ${r.imported}${r.skipped ? `, skipped ${r.skipped}` : ''}`); log.reload(); } catch (e) { toast.err(e); } finally { setBusy(false); if (file.current) file.current.value = ''; } };
  const W = can('seo.write');
  return <>
    <div className="card"><h3>Apply to</h3><div className="row" style={{ gap: 16 }}>{['page', 'product', 'category', 'policy'].map((t) => <label key={t} className="row" style={{ gap: 6 }}><input type="checkbox" checked={types.includes(t)} onChange={(e) => setTypes(e.target.checked ? [...types, t] : types.filter((x) => x !== t))} />{PL[t]}</label>)}
      </div></div>
    <div className="row2">
      <div className="wd l"><h3>Robots for all selected</h3><p className="hint">Set index/noindex for every selected item.</p><div className="row"><select value={robots} onChange={(e) => setRobots(e.target.value)}><option value="index,follow">index, follow</option><option value="noindex,nofollow">noindex, nofollow</option><option value="">Back to default</option></select><button className="btn" disabled={busy || !W} onClick={() => run('robots', { robots })}>Apply</button></div></div>
      <div className="wd l"><h3>CSV import / export</h3><p className="hint">Columns: type, key, meta_title, meta_description, robots, canonical_url.</p><div className="row"><button className="btn" onClick={exp}>Export CSV</button><input ref={file} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => imp(e.target.files?.[0])} /><button className="btn" disabled={busy || !W} onClick={() => file.current?.click()}>Import CSV…</button></div></div>
    </div>
    <div className="wd l" style={{ borderLeft: '4px solid #d6453a' }}><h3 style={{ color: '#d6453a' }}>Clear custom SEO data</h3><p className="hint">Removes all custom titles/descriptions for the selected types (defaults are used again). A backup is kept in History.</p><div className="row"><input placeholder="Type CLEAR to confirm" value={conf} onChange={(e) => setConf(e.target.value)} style={{ maxWidth: 220 }} /><button className="btn" disabled={busy || conf !== 'CLEAR' || !W} onClick={async () => { await run('clear'); setConf(''); }}>Clear data</button></div></div>
    {log.data?.ops?.length > 0 && <><h2 style={{ marginTop: 18 }}>Operations log</h2><div className="card tw"><table><tbody>{log.data.ops.map((o: any, i: number) => <tr key={i}><td>{when(o.ts)}</td><td><b>{o.action.replace(/_/g, ' ')}</b></td><td>{o.affected} item(s)</td><td>{o.detail}</td><td>{o.admin}</td></tr>)}</tbody></table></div></>}
  </>;
}

/* ---------------- Redirections + 404 monitor ---------------- */
function Redirections({ only404 }: { only404?: boolean } = {}) {
  const { can } = useAuth(); const toast = useToast(); const e = useLoad(() => get('/traffic/errors?days=30'), []); const r = useLoad(() => get('/redirects'), []);
  const [to, setTo] = useState<Record<string, string>>({}); const [nf, setNf] = useState(''); const [nt, setNt] = useState(''); const [code, setCode] = useState(301);
  const add = async (from: string, target: string) => { try { await post('/redirects', { fromPath: from.split('?')[0], toPath: target, statusCode: code }); toast.ok('Redirect created'); e.reload(); r.reload(); } catch (x) { toast.err(x); } };
  return <>
    {!only404 ? null : <h2>404 monitor <small className="hint" style={{ display: 'inline' }}>— pages real visitors could not find</small></h2>}
    {!e.data ? <Loading error={e.error} /> : !e.data.notFound.length ? <Alert kind="ok">No 404s recorded in the last 30 days.</Alert> : <div className="card tw"><table><thead><tr><th>Missing URL</th><th>Hits</th><th>Came from</th><th>Last seen</th><th>Redirect to</th></tr></thead><tbody>{e.data.notFound.map((x: any) => <tr key={x.path}><td>{short(x.path, 50)}</td><td>{x.hits}</td><td>{short(x.referrer || 'direct', 36)}</td><td>{when(x.last_seen)}</td>
      <td>{x.hasRedirect ? <span className="badge ok">Redirect set</span> : can('seo.write') ? <div className="row"><input placeholder="/new-page" value={to[x.path] || ''} onChange={(ev) => setTo({ ...to, [x.path]: ev.target.value })} style={{ maxWidth: 170 }} /><button className="btn sm pri" disabled={!to[x.path]} onClick={() => add(x.path, to[x.path])}>Redirect</button></div> : null}</td></tr>)}</tbody></table></div>}
    {only404 ? null : <h2 style={{ marginTop: 22 }}>Redirections</h2>}
    {only404 ? null : can('seo.write') && <div className="card"><div className="row"><input placeholder="/old-url" value={nf} onChange={(ev) => setNf(ev.target.value)} style={{ maxWidth: 240 }} /><span>→</span><input placeholder="/new-url or https://…" value={nt} onChange={(ev) => setNt(ev.target.value)} style={{ maxWidth: 300 }} /><select value={code} onChange={(ev) => setCode(Number(ev.target.value))}><option value={301}>301 permanent</option><option value={302}>302 temporary</option></select><button className="btn pri" disabled={!nf || !nt} onClick={async () => { await add(nf, nt); setNf(''); setNt(''); }}>Add redirect</button></div></div>}
    {only404 ? null : !r.data ? <Loading error={r.error} /> : !r.data.length ? <Empty title="No redirects yet" /> : <div className="card tw"><table><thead><tr><th>From</th><th>To</th><th>Type</th><th>Hits</th><th>Last hit</th><th /></tr></thead><tbody>{r.data.map((x: any) => <tr key={x.id}><td>{x.from_path}</td><td>{short(x.to_path, 50)}</td><td>{x.status_code}</td><td><b>{x.hits ?? 0}</b></td><td>{x.last_hit ? when(x.last_hit) : '—'}</td><td>{can('seo.write') && <button className="btn sm" onClick={async () => { try { await del('/redirects/' + x.id); toast.ok('Removed'); r.reload(); } catch (ev) { toast.err(ev); } }}>Delete</button>}</td></tr>)}</tbody></table></div>}
  </>;
}

/* ---------------- Traffic ---------------- */
function Traffic() {
  const [s, setS] = useState('ov'); const [days, setDays] = useState(7); const ov = useLoad(() => get('/traffic/overview?days=' + days), [days]); const sc = useLoad(() => get('/seo-health/score'), []);
  return <><Sub items={[['ov', 'Overview'], ['ips', 'Visitor IPs'], ['log', 'Live traffic'], ['refs', 'Referrers & blocked']]} v={s} on={setS} />
    {s === 'ov' && <HealthOverview score={sc.data} ov={ov.data} a={null} days={days} setDays={setDays} setTab={() => {}} />}
    {s === 'ips' && <Ips yourIp={ov.data?.yourIp} />}{s === 'log' && <Log />}{s === 'refs' && <Refs ov={ov.data} />}</>;
}

/* ---------------- Site audit ---------------- */
function AuditTab({ a }: { a: any }) { const [s, setS] = useState('pages'); return <><Sub items={[['pages', 'Page report'], ['err', 'Errors & broken links']]} v={s} on={setS} />{s === 'pages' ? <Pages a={a} /> : <Errors a={a} />}</>; }

/* ---------------- Image SEO ---------------- */
function Images() {
  const { can } = useAuth(); const toast = useToast(); const [all, setAll] = useState(false); const l = useLoad(() => get('/seo-master/images' + (all ? '?all=1' : '')), [all]); const [v, setV] = useState<Record<number, string>>({});
  return <><div className="row sp" style={{ marginBottom: 12 }}><div className="row"><button className={'btn sm ' + (!all ? 'pri' : '')} onClick={() => setAll(false)}>Missing alt text</button><button className={'btn sm ' + (all ? 'pri' : '')} onClick={() => setAll(true)}>All product images</button></div>
    {can('seo.write') && <button className="btn pri" onClick={async () => { try { const r = await post('/seo-master/images/auto'); toast.ok(`${r.affected} image(s) updated`); l.reload(); } catch (e) { toast.err(e); } }}>Auto-fill all missing alt text</button>}</div>
    {!l.data ? <Loading error={l.error} /> : !l.data.length ? <Alert kind="ok">Every product image has alt text.</Alert> : <div className="card tw"><table><thead><tr><th>Image</th><th>Product</th><th>Alt text</th><th /></tr></thead><tbody>{l.data.map((x: any) => <tr key={x.id + '-' + x.slug + x.position}><td><img src={x.url} alt="" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 8 }} /></td><td>{short(x.product, 44)}</td>
      <td><input value={v[x.id] ?? x.alt} placeholder="Describe the image…" onChange={(e) => setV({ ...v, [x.id]: e.target.value })} /></td><td>{can('seo.write') && v[x.id] !== undefined && v[x.id] !== x.alt && <button className="btn sm pri" onClick={async () => { try { await put('/seo-master/images/' + x.id, { alt: v[x.id] }); toast.ok('Saved'); l.reload(); } catch (e) { toast.err(e); } }}>Save</button>}</td></tr>)}</tbody></table></div>}</>;
}

/* ---------------- Audit e-mails ---------------- */
function Emails() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/seo-master/digest'), []); const [c, setC] = useState<any>(null);
  if (!l.data) return <Loading error={l.error} />; const v = c ?? l.data; const set = (k: string, x: any) => setC({ ...v, [k]: x });
  return <div className="card" style={{ maxWidth: 640 }}><h3>Scheduled SEO report</h3><p className="hint">A summary of your SEO score, weakest pages, spam traffic and errors, delivered to your inbox. Needs SMTP configured in Settings.</p>
    <label className="row" style={{ marginBottom: 12 }}><input type="checkbox" checked={v.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Send reports automatically</label>
    <Field label="Send to"><input type="email" value={v.email} onChange={(e) => set('email', e.target.value)} placeholder="you@retechie.com" /></Field>
    <Field label="How often"><select value={v.frequency} onChange={(e) => set('frequency', e.target.value)}><option value="weekly">Every week</option><option value="monthly">Every month</option></select></Field>
    {v.lastSent && <div className="hint">Last sent {when(v.lastSent)}</div>}
    {can('seo.write') && <div className="row" style={{ marginTop: 12 }}><button className="btn pri" onClick={async () => { try { await put('/seo-master/digest', { enabled: v.enabled, frequency: v.frequency, email: v.email }); toast.ok('Saved'); setC(null); l.reload(); } catch (e) { toast.err(e); } }}>Save</button>
      <button className="btn" onClick={async () => { try { await post('/seo-master/digest/test'); toast.ok('Test report sent'); } catch (e) { toast.err(e); } }}>Send test now</button></div>}</div>;
}

/* ---------------- Settings ---------------- */
function SettingsTab() {
  const [s, setS] = useState('meta');
  return <><Sub items={[['meta', 'Page metadata'], ['bulk', 'Bulk robots & CSV'], ['global', 'Global'], ['webmaster', 'Webmaster & tags'], ['jsonld', 'Structured data'], ['report', 'Validation report'], ['revisions', 'History']]} v={s} on={setS} />
    {s === 'meta' && <MetaEditor />}{s === 'bulk' && <Bulk />}{s === 'global' && <Global />}{s === 'webmaster' && <Webmaster />}{s === 'jsonld' && <JsonLd />}{s === 'report' && <Report />}{s === 'revisions' && <Revisions />}</>;
}

function MetaEditor() { const [t, setT] = useState('product'); return <><Sub items={[['page', 'Pages'], ['product', 'Products'], ['category', 'Categories'], ['policy', 'Policies']]} v={t} on={setT} /><Items key={t} type={t as any} /></>; }

/* ---------------- Crawl & indexability explorer ---------------- */
function Crawl({ a }: { a: any }) {
  const pages = useLoad(() => (a?.id && a.status === 'done' ? get(`/seo-health/audit/${a.id}/pages`) : Promise.resolve(null)), [a?.id, a?.status]);
  const [f, setF] = useState('all'); const [q, setQ] = useState('');
  const rows = useMemo(() => (pages.data || []).filter((p: any) => (!q || p.path.toLowerCase().includes(q.toLowerCase())) && (f === 'all' || (f === 'noindex' && !p.indexable) || (f === 'status' && p.status_code !== 200) || (f === 'orphan' && p.in_links === 0) || (f === 'slow' && p.ms > 1500))), [pages.data, f, q]);
  if (!a) return <Alert kind="info">No crawl yet. Press <b>Run full site audit</b>.</Alert>;
  if (a.status === 'running') return <Alert kind="info">Crawling… {a.done}/{a.total} URLs.</Alert>;
  if (!pages.data) return <Loading error={pages.error} />;
  const n = (fn: (p: any) => boolean) => pages.data.filter(fn).length;
  return <>
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}><Kpi l="URLs crawled" v={pages.data.length} /><Kpi l="Indexable" v={n((p) => p.indexable)} c="#1c9a4f" /><Kpi l="Not indexable" v={n((p) => !p.indexable)} c={n((p) => !p.indexable) ? '#d98b0b' : undefined} /><Kpi l="No internal links to them" v={n((p) => p.in_links === 0)} sub="orphan candidates" /></div>
    <div className="row" style={{ margin: '4px 0 10px', flexWrap: 'wrap' }}><input placeholder="Search URL…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} />{[['all', 'All'], ['noindex', 'Not indexable'], ['status', 'Non-200'], ['orphan', 'No inbound links'], ['slow', 'Slow']].map(([k, l]) => <button key={k} className={'btn sm ' + (f === k ? 'pri' : '')} onClick={() => setF(k)}>{l}</button>)}</div>
    <div className="card tw"><table><thead><tr><th>URL</th><th>Status</th><th>Indexable</th><th>Canonical</th><th>Robots</th><th>Inbound</th><th>Time</th></tr></thead><tbody>{rows.map((p: any) => <tr key={p.path}><td>{short(p.path, 50)}</td><td><span className={'badge ' + (p.status_code === 200 ? 'ok' : 'err')}>{p.status_code || 'fail'}</span></td><td>{p.indexable ? 'Yes' : <b style={{ color: '#d98b0b' }}>No</b>}</td><td style={{ fontSize: 12 }}>{short(p.canonical || '—', 44)}</td><td style={{ fontSize: 12 }}>{p.robots_meta || '—'}</td><td>{p.in_links}</td><td>{p.ms} ms</td></tr>)}</tbody></table></div>
    <p className="hint">Based on the last crawl ({when(a.finished_at)}). Indexability = HTTP 200 and no noindex tag/header.</p>
  </>;
}

/* ---------------- Added: live checks, focus keywords, social previews, unused media ---------------- */
const base = '/seo-analysis';
const bytes = (n: number) => (n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round(n / 1e3) + ' KB');
const Dot = ({ ok }: { ok: boolean | null }) => <i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 10, background: ok == null ? '#999' : ok ? '#2e9e5b' : '#d6453a', marginRight: 8 }} />;

function CheckRow({ c }: any) { return <div style={{ padding: '6px 0', borderBottom: '1px solid var(--line,#eee)' }}><Dot ok={c.ok} /><b>{c.label}</b> <span className="hint">{c.detail}</span>{c.ok === false && c.fix && <div className="hint" style={{ marginLeft: 18 }}>Fix: {c.fix}</div>}</div>; }

function LiveTech() {
  const [fresh, setFresh] = useState(0); const d = useLoad(() => get(base + '/technical' + (fresh ? '?fresh=1' : '')), [fresh]);
  if (!d.data) return <Loading error={d.error} />; const x = d.data;
  return <div style={{ display: 'grid', gap: 12 }}>
    <div className="row sp"><span><Badge kind="ok">{x.summary.ok} passed</Badge> <Badge kind={x.summary.bad ? 'err' : 'ok'}>{x.summary.bad} to fix</Badge></span><button className="btn sm" onClick={() => setFresh(fresh + 1)}>↻ Re-check now</button></div>
    <div className="card"><h3 style={{ marginTop: 0 }}>Sitemap &amp; robots.txt</h3>{x.checks.map((c: any) => <CheckRow key={c.id} c={c} />)}</div>
    {x.pages.map((p: any) => <div className="card" key={p.path}><h3 style={{ marginTop: 0 }}>Page: {p.path}</h3>{p.checks.map((c: any) => <CheckRow key={c.id} c={c} />)}</div>)}
  </div>;
}

function FocusKeywords() {
  const { can } = useAuth(); const toast = useToast(); const d = useLoad(() => get(base + '/keywords'), []); const [edit, setEdit] = useState<Record<string, string>>({});
  if (!d.data) return <Loading error={d.error} />; const x = d.data; const k = (r: any) => r.type + '|' + r.key;
  const save = async (r: any) => { try { await put(base + '/keywords', { type: r.type, key: r.key, keyword: edit[k(r)] ?? r.keyword }); toast.ok('Saved'); d.reload(); } catch (e) { toast.err(e); } };
  const tick = (v: boolean | null) => (v == null ? '—' : v ? '✓' : '✗');
  return <div style={{ display: 'grid', gap: 12 }}>
    {x.gsc !== 'connected' && <Alert kind="info">{x.gsc === 'unavailable' ? 'Google Search Console data is unavailable right now.' : 'Connect Google Search Console in SEO Master to see clicks and positions.'}</Alert>}
    {x.duplicates.length > 0 && <Alert kind="warn">Same keyword on more than one page (they compete): {x.duplicates.map((c: any) => `"${c.keyword}" → ${c.pages.map((p: any) => p.label).join(', ')}`).join(' · ')}</Alert>}
    {x.opportunities.length > 0 && <div className="card"><h3 style={{ marginTop: 0 }}>Opportunities (position 5–20)</h3>{x.opportunities.map((r: any) => <div key={k(r)} className="row sp"><span>{r.label}</span><span className="hint">pos {r.gsc.position} · {r.gsc.impressions} impressions · {r.gsc.clicks} clicks</span></div>)}</div>}
    <div className="tw"><table><thead><tr><th>Page</th><th>Focus keyword</th><th>Title</th><th>Desc</th><th>URL</th><th>Clicks</th><th>Impr.</th><th>Pos.</th></tr></thead><tbody>{x.rows.map((r: any) => <tr key={k(r)}>
      <td><b>{r.label}</b><div className="hint">{r.type} · {r.url}</div></td>
      <td>{can('seo.write') ? <span className="row"><input value={edit[k(r)] ?? r.keyword} maxLength={120} onChange={(e) => setEdit({ ...edit, [k(r)]: e.target.value })} style={{ width: 170 }} />{edit[k(r)] !== undefined && edit[k(r)] !== r.keyword && <button className="btn sm pri" onClick={() => save(r)}>Save</button>}</span> : r.keyword || '—'}{r.duplicate && <> <Badge kind="warn">duplicate</Badge></>}</td>
      <td>{tick(r.inTitle)}</td><td>{tick(r.inDescription)}</td><td>{tick(r.inUrl)}</td><td>{r.gsc?.clicks ?? '—'}</td><td>{r.gsc?.impressions ?? '—'}</td><td>{r.gsc?.position ?? '—'}</td></tr>)}</tbody></table></div>
  </div>;
}

function Preview({ r }: any) {
  const img = r.og.image; const host = r.url ? new URL(r.url).host : '';
  return <div className="card" style={{ display: 'grid', gap: 10 }}>
    <div className="row sp"><div><b>{r.label}</b> <span className="hint">{r.type}</span></div>{r.problems ? <Badge kind="err">{r.problems} issue(s)</Badge> : <Badge kind="ok">Good</Badge>}</div>
    <div className="grid g3">
      <div><div className="hint">Google</div><div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, background: '#fff', color: '#202124' }}><div style={{ fontSize: 12, color: '#4d5156' }}>{host}</div><div style={{ color: '#1a0dab', fontSize: 17, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.title}</div><div style={{ fontSize: 13, color: '#4d5156' }}>{(r.description || '').slice(0, 155)}</div></div></div>
      <div><div className="hint">Facebook / WhatsApp / LinkedIn</div><div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', background: '#f0f2f5', color: '#050505' }}>{img ? <img src={img} alt="" style={{ width: '100%', aspectRatio: '1.91/1', objectFit: 'cover', display: 'block' }} /> : <div style={{ aspectRatio: '1.91/1', display: 'grid', placeItems: 'center', color: '#888' }}>No image</div>}<div style={{ padding: 8 }}><div style={{ fontSize: 11, textTransform: 'uppercase', color: '#65676b' }}>{host}</div><b style={{ fontSize: 14 }}>{r.og.title}</b></div></div></div>
      <div><div className="hint">X (Twitter) — {r.twitter.card || 'no card'}</div><div style={{ border: '1px solid #ddd', borderRadius: 14, overflow: 'hidden', background: '#fff', color: '#0f1419' }}>{img ? <img src={img} alt="" style={{ width: '100%', aspectRatio: '1.91/1', objectFit: 'cover', display: 'block' }} /> : <div style={{ aspectRatio: '1.91/1', display: 'grid', placeItems: 'center', color: '#888' }}>No image</div>}<div style={{ padding: 8, fontSize: 14 }}>{r.twitter.title || r.og.title}<div style={{ fontSize: 12, color: '#536471' }}>{host}</div></div></div></div>
    </div>
    <div>{r.checks.filter((c: any) => c.ok === false).map((c: any) => <div key={c.id} className="hint"><Dot ok={false} />{c.label}{c.detail ? ' — ' + c.detail : ''}{c.fix ? ' · ' + c.fix : ''}</div>)}</div>
  </div>;
}
function Social() {
  const d = useLoad(() => get(base + '/social'), []); const [only, setOnly] = useState(false);
  if (!d.data) return <Loading error={d.error} />;
  return <div style={{ display: 'grid', gap: 12 }}><label className="row"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Only pages with issues</label>
    {d.data.rows.filter((r: any) => !only || r.problems).map((r: any) => <Preview key={r.type + r.key} r={r} />)}</div>;
}

function Unused() {
  const { can } = useAuth(); const toast = useToast(); const [ask, box] = useConfirm(); const d = useLoad(() => get(base + '/unused-media'), []); const [sel, setSel] = useState<number[]>([]); const [busy, setBusy] = useState(false);
  if (!d.data) return <Loading error={d.error} />; const files: any[] = d.data.files; const s = d.data.stats; const size = files.filter((f) => sel.includes(f.id)).reduce((a, f) => a + Number(f.file_size), 0);
  const del = async () => {
    if (!(await ask({ title: `Delete ${sel.length} file(s)?`, body: `This frees ${bytes(size)} and cannot be undone. Files that became used in the meantime are skipped.`, danger: true, ok: 'Delete' } as any))) return;
    setBusy(true); try { const r: any = await post(base + '/unused-media/delete', { ids: sel.slice(0, 200) }); toast.ok(`Deleted ${r.deleted.length}, freed ${bytes(r.freedBytes)}${r.skipped.length ? `, skipped ${r.skipped.length}` : ''}`); setSel([]); d.reload(); } catch (e) { toast.err(e); } setBusy(false);
  };
  return <div style={{ display: 'grid', gap: 12 }}>{box}
    <div className="row" style={{ flexWrap: 'wrap' }}><Badge>{s.total} files</Badge><Badge kind="warn">{s.unused} unused</Badge><Badge>{bytes(s.freeable)} can be freed</Badge>{s.skippedProtected > 0 && <Badge>{s.skippedProtected} protected / referenced in text</Badge>}</div>
    <Alert kind="info">Files uploaded in the last 24 hours, protected files and files mentioned in settings or page text are never listed.</Alert>
    {can('media.delete') && files.length > 0 && <div className="row"><button className="btn sm" onClick={() => setSel(sel.length === Math.min(files.length, 200) ? [] : files.slice(0, 200).map((f) => f.id))}>{sel.length ? 'Clear' : 'Select first 200'}</button><button className="btn sm danger" disabled={!sel.length || busy} onClick={del}>Delete selected ({bytes(size)})</button></div>}
    {!files.length ? <div className="card">No unused files 🎉</div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>{files.map((f) => <label key={f.id} className="card" style={{ padding: 8, cursor: 'pointer', outline: sel.includes(f.id) ? '2px solid var(--pri,#2563eb)' : 'none' }}>
      {can('media.delete') && <input type="checkbox" checked={sel.includes(f.id)} onChange={() => setSel(sel.includes(f.id) ? sel.filter((i) => i !== f.id) : [...sel, f.id])} />}
      <img src={f.public_url} alt="" loading="lazy" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, display: 'block' }} /><div style={{ fontSize: 12, wordBreak: 'break-all' }}>{f.original_filename}</div><div className="hint">{bytes(f.file_size)} · {f.folder}</div></label>)}</div>}
  </div>;
}

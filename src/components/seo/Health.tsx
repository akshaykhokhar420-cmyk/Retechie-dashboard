'use client';
import { askConfirm } from '@/components/Confirm';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { get, post, del, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Alert, useLoad, Loading, Empty } from '@/components/ui';

export const tone = (s: number | null) => (s === null ? '#9aa8a1' : s >= 85 ? '#1c9a4f' : s >= 60 ? '#d98b0b' : '#d6453a');
const VERD: Record<string, [string, string]> = { human: ['ok', 'Human'], crawler: ['info', 'Search/AI bot'], suspicious: ['warn', 'Suspicious'], spam: ['err', 'Spam / attack'] };
const SEV: Record<string, string> = { error: 'err', warning: 'warn', notice: 'info' };
export const short = (s: string, n = 60) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function Ring({ v, size = 150, label }: { v: number | null; size?: number; label?: string }) {
  const r = size / 2 - 12, C = 2 * Math.PI * r, p = v ?? 0;
  return <div style={{ position: 'relative', width: size, height: size }}><svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="12" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone(v)} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(C * p) / 100} ${C}`} style={{ transition: 'stroke-dasharray .6s' }} /></svg>
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}><div><b style={{ fontSize: size / 3.4, letterSpacing: '-.03em' }}>{v ?? '—'}</b>{label && <div className="hint" style={{ margin: 0 }}>{label}</div>}</div></div></div>;
}
export const Kpi = ({ l, v, sub, c }: { l: string; v: any; sub?: string; c?: string }) => <div className="wd"><div className="hint" style={{ margin: 0 }}>{l}</div><b style={{ fontSize: 28, letterSpacing: '-.02em', color: c }}>{v}</b>{sub && <div className="hint" style={{ margin: 0 }}>{sub}</div>}</div>;

function Stacked({ rows }: { rows: { d: string; human: number; crawler: number; bot: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.human + r.crawler + r.bot));
  if (!rows.length) return <Empty title="No visitor data yet" text="Hits appear here once the storefront is live and REVALIDATE_SECRET is set on it." />;
  return <div><div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>{rows.map((r) => <div key={r.d} title={`${String(r.d).slice(0, 10)}: ${r.human} human, ${r.crawler} crawler, ${r.bot} bot/attack`} style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', height: '100%', justifyContent: 'flex-start' }}>
    {[[r.human, '#2fbf63'], [r.crawler, '#6aa7f0'], [r.bot, '#d6453a']].map(([n, c], i) => <div key={i} style={{ height: `${(Number(n) / max) * 100}%`, background: c as string, borderRadius: i === 2 ? '6px 6px 0 0' : 0, minHeight: Number(n) ? 3 : 0 }} />)}</div>)}</div>
    <div className="row" style={{ marginTop: 10, gap: 16, fontSize: 12.5 }}><span><i style={{ background: '#2fbf63' }} className="dot" /> Real people</span><span><i style={{ background: '#6aa7f0' }} className="dot" /> Search / AI crawlers</span><span><i style={{ background: '#d6453a' }} className="dot" /> Bots, scanners & spam</span></div></div>;
}

export function Overview({ score, ov, a, days, setDays, setTab }: any) {
  const s = a?.summary;
  return <>
    <div className="row3" style={{ gridTemplateColumns: '260px 1fr' }}>
      <div className="wd" style={{ display: 'grid', placeItems: 'center', gap: 8 }}><h3>Website SEO health</h3><Ring v={score?.score ?? null} label="out of 100" />
        <div className="hint" style={{ margin: 0 }}>{a?.finished_at ? `Audited ${when(a.finished_at)}` : 'Run the site audit to get a score'}</div></div>
      <div className="wd"><h3 style={{ textAlign: 'left' }}>What makes up the score</h3>
        {(score?.parts || []).map((p: any) => <div key={p.k} style={{ margin: '10px 0' }}><div className="row sp"><span>{p.k} <small className="hint" style={{ display: 'inline' }}>({Math.round(p.w * 100)}%)</small></span><b style={{ color: tone(p.v) }}>{p.v ?? 'not run yet'}</b></div><div className="prog"><i style={{ width: `${p.v ?? 0}%`, background: tone(p.v) }} /></div></div>)}
        {s?.site?.length > 0 && <div style={{ marginTop: 10 }}>{s.site.map((x: any, i: number) => <div key={i} className={'badge ' + SEV[x.sev]} style={{ margin: '3px 6px 3px 0' }}>{x.msg}</div>)}</div>}</div>
    </div>
    <div className="row sp" style={{ margin: '4px 0 10px' }}><h2 style={{ margin: 0 }}>Visitors</h2><div className="row">{[1, 7, 30].map((d) => <button key={d} className={'btn sm ' + (days === d ? 'pri' : '')} onClick={() => setDays(d)}>{d === 1 ? '24 hours' : d + ' days'}</button>)}</div></div>
    {!ov ? <Loading /> : <>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
        <Kpi l="Unique IPs" v={ov.visitors} sub={`${ov.jsVerified} verified as real browsers`} />
        <Kpi l="Page views (human)" v={ov.human} sub={`${ov.crawler} by search/AI crawlers`} />
        <Kpi l="Spam / attack share" v={ov.spamShare + '%'} c={ov.spamShare > 25 ? '#d6453a' : ov.spamShare > 10 ? '#d98b0b' : '#1c9a4f'} sub={`${ov.spamIps} spam IPs · ${ov.suspiciousIps} suspicious`} />
        <Kpi l="404 errors" v={ov.errors404} c={ov.errors404 ? '#d98b0b' : undefined} sub="seen by real visitors" />
        <Kpi l="JavaScript errors" v={ov.errorsJs} c={ov.errorsJs ? '#d6453a' : undefined} sub="in visitors' browsers" />
      </div>
      {ov.spamShare > 25 && <Alert kind="err">High spam traffic: {ov.spamShare}% of requests come from bots, scanners or attack-like IPs. Review them in <b>Visitors & IPs</b> and block the worst.</Alert>}
      {ov.probe > 0 && <Alert kind="warn">{ov.probe} request(s) probed for WordPress/admin/secret files (e.g. /wp-login.php). This is normal for a domain that used to run WordPress — block repeat offenders.</Alert>}
      <div className="wd" style={{ marginBottom: 16 }}><h3 style={{ textAlign: 'left' }}>Traffic by day</h3><Stacked rows={ov.daily} /></div>
      <div className="row2"><div className="wd"><h3 style={{ textAlign: 'left' }}>Top pages (real visitors)</h3>{ov.topPages.length ? <table><thead><tr><th>Page</th><th>Views</th><th>Visitors</th></tr></thead><tbody>{ov.topPages.map((p: any) => <tr key={p.path}><td>{short(p.path, 48)}</td><td>{p.hits}</td><td>{p.visitors}</td></tr>)}</tbody></table> : <div className="hint">No data yet.</div>}</div>
        <div className="wd"><h3 style={{ textAlign: 'left' }}>Top issues found by the audit</h3>{s ? Object.entries(s.byCode as Record<string, any>).sort((x: any, y: any) => ({ error: 0, warning: 1, notice: 2 } as any)[x[1].sev] - ({ error: 0, warning: 1, notice: 2 } as any)[y[1].sev] || y[1].count - x[1].count).slice(0, 10).map(([k, v]: any) => <div key={k} className="row sp" style={{ padding: '5px 0' }}><span><span className={'badge ' + SEV[v.sev]}>{v.sev}</span> {v.msg}</span><b>{v.count}</b></div>) : <div className="hint">Run the audit to see issues.</div>}
          {s && <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setTab('pages')}>See all pages</button>}</div></div></>}
  </>;
}

export function Pages({ a }: { a: any }) {
  const pages = useLoad(() => (a?.id && a.status === 'done' ? get(`/seo-health/audit/${a.id}/pages`) : Promise.resolve(null)), [a?.id, a?.status]);
  const [q, setQ] = useState(''); const [sev, setSev] = useState(''); const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => (pages.data || []).filter((p: any) => (!q || p.path.includes(q) || p.title.toLowerCase().includes(q.toLowerCase())) && (!sev || p.issues.some((i: any) => i.sev === sev))), [pages.data, q, sev]);
  if (!a) return <Alert kind="info">No audit yet. Click <b>Run full site audit</b> — it crawls every page like Google does.</Alert>;
  if (a.status === 'running') return <Alert kind="info">Audit running… {a.done}/{a.total} pages checked.</Alert>;
  if (a.status === 'failed') return <Alert kind="err">The last audit failed or was interrupted. Run it again.</Alert>;
  if (!pages.data) return <Loading error={pages.error} />;
  return <><div className="row" style={{ marginBottom: 10 }}><input placeholder="Search page or title…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />{['', 'error', 'warning', 'notice'].map((x) => <button key={x} className={'btn sm ' + (sev === x ? 'pri' : '')} onClick={() => setSev(x)}>{x || 'All'}</button>)}<span className="hint" style={{ margin: 0 }}>{rows.length} of {pages.data.length} pages · average {a.summary?.avgMs} ms</span></div>
    <div className="card tw"><table><thead><tr><th>Score</th><th>Page</th><th>Status</th><th>Time</th><th>Issues</th></tr></thead><tbody>{rows.map((p: any) => <><tr key={p.path} style={{ cursor: 'pointer' }} onClick={() => setOpen(open === p.path ? null : p.path)}>
      <td><b style={{ color: tone(p.score) }}>{p.score}</b></td><td><b>{short(p.title || '(no title)', 50)}</b><div className="hint" style={{ margin: 0 }}>{p.path}</div></td><td><span className={'badge ' + (p.status_code >= 400 || !p.status_code ? 'err' : p.status_code >= 300 ? 'warn' : 'ok')}>{p.status_code || 'fail'}</span></td><td>{p.ms} ms</td>
      <td>{['error', 'warning', 'notice'].map((s) => { const n = p.issues.filter((i: any) => i.sev === s).length; return n ? <span key={s} className={'badge ' + SEV[s]} style={{ marginRight: 4 }}>{n}</span> : null; })}</td></tr>
      {open === p.path && <tr key={p.path + 'x'}><td colSpan={5} style={{ background: 'var(--line2)' }}>{p.issues.length ? p.issues.map((i: any, k: number) => <div key={k} style={{ padding: '3px 0' }}><span className={'badge ' + SEV[i.sev]}>{i.sev}</span> {i.msg}</div>) : 'No issues.'}</td></tr>}</>)}</tbody></table></div></>;
}

export function Ips({ yourIp }: { yourIp?: string }) {
  const { can } = useAuth(); const toast = useToast(); const [hours, setHours] = useState(24); const [v, setV] = useState(''); const [open, setOpen] = useState<string | null>(null);
  const r = useLoad(() => get(`/traffic/ips?hours=${hours}${v ? '&verdict=' + v : ''}`), [hours, v]);
  const hits = useLoad(() => (open ? get('/traffic/live?limit=40&ip=' + encodeURIComponent(open)) : Promise.resolve([])), [open]);
  const block = async (ip: string, reason: string) => { if (!await askConfirm(`Block ${ip}? They will get “Access denied” on the website.`)) return; try { await post('/traffic/block', { ip, reason }); toast.ok('Blocked'); r.reload(); } catch (e) { toast.err(e); } };
  const unblock = async (ip: string) => { try { await del('/traffic/block/' + encodeURIComponent(ip)); toast.ok('Unblocked'); r.reload(); } catch (e) { toast.err(e); } };
  return <><div className="row" style={{ marginBottom: 10 }}>{[[1, '1 hour'], [24, '24 hours'], [168, '7 days'], [720, '30 days']].map(([h, l]) => <button key={h} className={'btn sm ' + (hours === h ? 'pri' : '')} onClick={() => setHours(h as number)}>{l}</button>)}
    <span style={{ width: 12 }} />{[['', 'All'], ['spam', 'Spam'], ['suspicious', 'Suspicious'], ['human', 'Human'], ['crawler', 'Crawlers']].map(([k, l]) => <button key={k} className={'btn sm ' + (v === k ? 'pri' : '')} onClick={() => setV(k)}>{l}</button>)}
    {yourIp && <span className="hint" style={{ margin: '0 0 0 auto' }}>Your IP: {yourIp}</span>}</div>
    {!r.data ? <Loading error={r.error} /> : !r.data.length ? <Empty title="No visitors in this period" text="Visitor IPs appear once the storefront logs traffic." /> :
      <div className="card tw"><table><thead><tr><th>IP address</th><th>Verdict</th><th>Spam score</th><th>Page loads</th><th>Real browser</th><th>Pages</th><th>Last seen</th><th>Why</th><th /></tr></thead><tbody>{r.data.map((x: any) => <><tr key={x.ip}>
        <td><button className="btn sm" onClick={() => setOpen(open === x.ip ? null : x.ip)}>{x.ip}</button></td><td><span className={'badge ' + VERD[x.verdict][0]}>{VERD[x.verdict][1]}</span></td>
        <td><b style={{ color: tone(100 - x.score) }}>{x.score}</b></td><td>{x.hits}</td><td>{x.beacons ? '✓ ' + x.beacons : '✗ none'}</td><td>{x.paths}</td><td>{when(x.lastSeen)}</td>
        <td style={{ maxWidth: 320, fontSize: 12.5 }}>{x.reasons.join(' · ') || <span className="hint">Looks like a normal visitor</span>}</td>
        <td>{can('seo.write') && (x.blocked ? <button className="btn sm" onClick={() => unblock(x.ip)}>Unblock</button> : x.verdict !== 'human' && x.verdict !== 'crawler' ? <button className="btn sm pri" onClick={() => block(x.ip, x.reasons[0] || '')}>Block</button> : null)}</td></tr>
        {open === x.ip && <tr key={x.ip + 'h'}><td colSpan={9} style={{ background: 'var(--line2)' }}><div className="hint">{x.ua}</div>{!hits.data ? 'Loading…' : hits.data.map((h: any) => <div key={h.id} style={{ fontSize: 12.5, padding: '2px 0' }}>{when(h.ts)} · <b>{h.kind === 'beacon' ? 'JS ✓' : h.cls}</b> · {short(h.path, 80)}{h.referrer ? ` ← ${short(h.referrer, 50)}` : ''}</div>)}</td></tr>}</>)}</tbody></table></div>}</>;
}

export function Log() {
  const [cls, setCls] = useState(''); const l = useLoad(() => get('/traffic/live?limit=120' + (cls ? '&cls=' + cls : '')), [cls]);
  useEffect(() => { const t = setInterval(l.reload, 10000); return () => clearInterval(t); }, [l.reload]);
  const C: Record<string, string> = { human: 'ok', crawler: 'info', bot: 'warn', probe: 'err' };
  return <><div className="row" style={{ marginBottom: 10 }}>{[['', 'All'], ['human', 'Human'], ['crawler', 'Crawlers'], ['bot', 'Bots'], ['probe', 'Attack probes']].map(([k, x]) => <button key={k} className={'btn sm ' + (cls === k ? 'pri' : '')} onClick={() => setCls(k)}>{x}</button>)}<span className="hint" style={{ margin: '0 0 0 auto' }}>Refreshes every 10 seconds</span></div>
    {!l.data ? <Loading error={l.error} /> : !l.data.length ? <Empty title="No traffic logged yet" /> : <div className="card tw"><table><thead><tr><th>Time</th><th>IP</th><th>Type</th><th>Page</th><th>Came from</th><th>Browser / bot</th></tr></thead><tbody>{l.data.map((h: any) => <tr key={h.id}><td>{when(h.ts)}</td><td>{h.ip}</td><td><span className={'badge ' + (h.kind === 'beacon' ? 'ok' : C[h.cls])}>{h.kind === 'beacon' ? 'JS ran' : h.bot_name || h.cls}</span></td><td>{short(h.path, 46)}</td><td>{short(h.referrer || '—', 36)}</td><td className="hint" style={{ margin: 0 }}>{short(h.ua || '—', 48)}</td></tr>)}</tbody></table></div>}</>;
}

export function Errors({ a }: { a: any }) {
  const e = useLoad(() => get('/traffic/errors?days=30'), []); const broken = a?.summary?.broken || [];
  return !e.data ? <Loading error={e.error} /> : <>
    <h2>Pages visitors could not find (404)</h2>
    {!e.data.notFound.length ? <Alert kind="ok">No 404s recorded in the last 30 days.</Alert> : <div className="card tw"><table><thead><tr><th>Missing URL</th><th>Hits</th><th>IPs</th><th>Came from</th><th>Last seen</th><th>Fix</th></tr></thead><tbody>{e.data.notFound.map((r: any) => <tr key={r.path}><td>{short(r.path, 60)}</td><td>{r.hits}</td><td>{r.ips}</td><td>{short(r.referrer || 'direct', 40)}</td><td>{when(r.last_seen)}</td><td>{r.hasRedirect ? <span className="badge ok">Redirect set</span> : <Link className="btn sm" href="/seo">Add redirect</Link>}</td></tr>)}</tbody></table></div>}
    <h2 style={{ marginTop: 20 }}>Broken links found by the audit</h2>
    {!broken.length ? <Alert kind="ok">{a ? 'No broken internal links.' : 'Run the audit to check links.'}</Alert> : <div className="card tw"><table><thead><tr><th>Broken link</th><th>Status</th><th>Found on</th></tr></thead><tbody>{broken.map((b: any) => <tr key={b.url}><td>{b.url}</td><td><span className="badge err">{b.status || 'no response'}</span></td><td>{b.from.join(', ')}</td></tr>)}</tbody></table></div>}
    <h2 style={{ marginTop: 20 }}>JavaScript errors in visitors’ browsers</h2>
    {!e.data.js.length ? <Alert kind="ok">No JavaScript errors reported.</Alert> : <div className="card tw"><table><thead><tr><th>Error</th><th>Page</th><th>Times</th><th>Last seen</th></tr></thead><tbody>{e.data.js.map((r: any, i: number) => <tr key={i}><td>{short(r.message, 90)}</td><td>{r.path}</td><td>{r.hits}</td><td>{when(r.last_seen)}</td></tr>)}</tbody></table></div>}</>;
}

export function Refs({ ov }: { ov: any }) {
  const { can } = useAuth(); const toast = useToast(); const b = useLoad(() => get('/traffic/blocked'), []);
  return <><h2>Where traffic comes from</h2>{!ov ? <Loading /> : !ov.referrers.length ? <Empty title="No referrer data yet" /> : <div className="card tw"><table><thead><tr><th>Referrer</th><th>Visits</th><th>IPs</th><th>Real browsers</th><th /></tr></thead><tbody>{ov.referrers.map((r: any) => <tr key={r.host}><td>{r.host}</td><td>{r.hits}</td><td>{r.ips}</td><td>{r.beacons}</td><td>{r.spammy ? <span className="badge err">Looks like referrer spam</span> : r.hits >= 10 && !r.beacons ? <span className="badge warn">No real browsers</span> : null}</td></tr>)}</tbody></table></div>}
    <h2 style={{ marginTop: 20 }}>Blocked IPs</h2>{!b.data ? <Loading error={b.error} /> : !b.data.length ? <Alert kind="info">No IPs blocked.</Alert> : <div className="card tw"><table><thead><tr><th>IP</th><th>Reason</th><th>By</th><th>When</th><th /></tr></thead><tbody>{b.data.map((x: any) => <tr key={x.ip}><td>{x.ip}</td><td>{x.reason}</td><td>{x.created_by}</td><td>{when(x.created_at)}</td><td>{can('seo.write') && <button className="btn sm" onClick={async () => { try { await del('/traffic/block/' + encodeURIComponent(x.ip)); toast.ok('Unblocked'); b.reload(); } catch (e) { toast.err(e); } }}>Unblock</button>}</td></tr>)}</tbody></table></div>}</>;
}

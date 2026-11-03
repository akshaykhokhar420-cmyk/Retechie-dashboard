'use client';
import Link from 'next/link';
import { useState } from 'react';
import { get, put, post, patch, del, qs, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Tabs, Badge, Modal, Field, Alert, useLoad, Loading, confirmBox } from '@/components/ui';

type Tab = 'banner' | 'categories' | 'registry' | 'integrations' | 'policy' | 'consents' | 'stats';
export default function Cookies() {
  const [tab, setTab] = useState<Tab>('banner');
  return <><PageHead title="Cookies & privacy" sub="Consent banner, cookie registry, scripts that run only after consent, policy versions and consent records." />
    <Tabs tabs={[['banner', 'Banner'], ['categories', 'Categories'], ['registry', 'Cookie registry'], ['integrations', 'Analytics & marketing tags'], ['policy', 'Policy versions'], ['consents', 'Consent records'], ['stats', 'Statistics']]} value={tab} onChange={setTab} />
    {tab === 'banner' && <Banner />}{tab === 'categories' && <Cats />}{tab === 'registry' && <Registry />}{tab === 'integrations' && <Integrations />}{tab === 'policy' && <Policy />}{tab === 'consents' && <Consents />}{tab === 'stats' && <Stats />}</>;
}
function Banner() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/cookies/settings'), []); const [s, setS] = useState<any>(null); const [recon, setRecon] = useState(false);
  if (!l.data) return <Loading error={l.error} />; const base = l.data.draft.settings; const v = s ?? base; const hasDraft = l.data.draft.hasDraft;
  const set = (k: string, x: any) => setS({ ...v, [k]: x }); const th = (k: string, x: any) => setS({ ...v, theme: { ...v.theme, [k]: x } });
  const colour = (k: string, label: string) => <Field label={label}><div className="row"><input type="color" style={{ width: 46, padding: 2 }} value={v.theme[k].length === 7 ? v.theme[k] : '#000000'} onChange={(e) => th(k, e.target.value)} /><input value={v.theme[k]} onChange={(e) => th(k, e.target.value)} /></div></Field>;
  return <div className="grid g2" style={{ alignItems: 'start' }}><div className="card">
    {hasDraft && !s && <Alert kind="warn">There are unpublished banner changes.</Alert>}
    <label className="row"><input type="checkbox" checked={v.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Show the cookie banner</label>
    <div className="grid g2" style={{ marginTop: 12 }}><Field label="Position"><select value={v.position} onChange={(e) => set('position', e.target.value)}><option>bottom</option><option>top</option><option>modal</option></select></Field><Field label="Layout"><select value={v.layout} onChange={(e) => set('layout', e.target.value)}><option>bar</option><option>box</option></select></Field>
      <Field label="Consent valid for (days)"><input type="number" value={v.consentExpiryDays} onChange={(e) => set('consentExpiryDays', Number(e.target.value))} /></Field><Field label="Keep consent records (days)"><input type="number" value={v.retentionDays} onChange={(e) => set('retentionDays', Number(e.target.value))} /></Field></div>
    <label className="row"><input type="checkbox" checked={v.showRejectButton} onChange={(e) => set('showRejectButton', e.target.checked)} /> Show “Reject optional cookies” on the first layer</label>
    <label className="row"><input type="checkbox" checked={v.floatingButton} onChange={(e) => set('floatingButton', e.target.checked)} /> Floating “Cookie settings” button</label>
    <label className="row"><input type="checkbox" checked={v.recordConsent} onChange={(e) => set('recordConsent', e.target.checked)} /> Record pseudonymous consent choices (no IP address or personal data)</label>
    <label className="row"><input type="checkbox" checked={v.renewOnPolicyChange} onChange={(e) => set('renewOnPolicyChange', e.target.checked)} /> Ask again when the policy changes</label>
    <Field label="Consent mode"><select value={v.jurisdiction.mode} onChange={(e) => set('jurisdiction', { ...v.jurisdiction, mode: e.target.value })}><option value="opt_in">Opt-in (nothing optional runs before consent)</option><option value="notice_only">Notice only</option></select></Field>
    <h3>Colours & shape</h3><div className="grid g2">{colour('background', 'Background')}{colour('text', 'Text')}{colour('accent', 'Button')}{colour('accentText', 'Button text')}{colour('border', 'Border')}<Field label="Corner radius (px)"><input type="number" value={v.theme.radius} onChange={(e) => th('radius', Number(e.target.value))} /></Field></div>
    <p className="hint">Banner wording is edited in <Link href="/content?q=cookie.">Text &amp; labels</Link> (keys starting <code>cookie.</code>).</p>
    {can('cookies.write') && <div className="sticky-bar"><button className="btn" disabled={!s} onClick={async () => { try { await put('/cookies/settings', s); toast.ok('Draft saved'); setS(null); l.reload(); } catch (e) { toast.err(e); } }}>Save draft</button>
      <label className="row"><input type="checkbox" checked={recon} onChange={(e) => setRecon(e.target.checked)} /> Ask all visitors again</label>
      <button className="btn pri" disabled={!hasDraft || !!s} onClick={async () => { try { await post('/cookies/settings/publish', { reconsent: recon }); toast.ok('Published'); l.reload(); } catch (e) { toast.err(e); } }}>Publish</button></div>}</div>
    <div className="card"><h3>Preview</h3><div style={{ background: v.theme.background, color: v.theme.text, border: `1px solid ${v.theme.border}`, borderRadius: v.theme.radius, padding: v.theme.spacing, fontSize: v.theme.fontSize }}>
      <b>We use cookies</b><p style={{ margin: '6px 0 12px' }}>Necessary cookies keep the store working. Optional cookies run only if you allow them.</p><span style={{ background: v.theme.accent, color: v.theme.accentText, padding: '6px 14px', borderRadius: 8, marginRight: 8, display: 'inline-block' }}>Accept all</span>{v.showRejectButton && <span style={{ border: `1px solid ${v.theme.text}`, padding: '5px 14px', borderRadius: 8, marginRight: 8, display: 'inline-block' }}>Reject optional</span>}<span style={{ textDecoration: 'underline' }}>Manage</span></div></div></div>;
}
function Cats() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/cookies/categories'), []);
  if (!l.data) return <Loading error={l.error} />;
  return <div className="card tw"><table><thead><tr><th>Category</th><th>Required</th><th>Available to visitors</th></tr></thead><tbody>{l.data.map((c: any) => <tr key={c.slug}><td><b>{c.slug}</b><div className="hint">Name &amp; description are text keys <code>{c.name_key}</code>, <code>{c.description_key}</code></div></td><td>{c.is_required ? 'Always on' : 'Optional'}</td>
    <td><input type="checkbox" disabled={!!c.is_required || !can('cookies.write')} checked={!!c.is_enabled} onChange={async (e) => { try { await patch('/cookies/categories/' + c.slug, { enabled: e.target.checked }); l.reload(); } catch (x) { toast.err(x); } }} /></td></tr>)}</tbody></table></div>;
}
const blankReg = { name: '', technology: 'cookie', provider: '', categorySlug: 'analytics', purpose: '', duration: '', party: 'first', host: '', service: '', requiresConsent: true, isActive: true };
function Registry() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/cookies/registry'), []); const [ed, setEd] = useState<any>(null);
  if (!l.data) return <Loading error={l.error} />;
  return <><div className="row sp" style={{ marginBottom: 10 }}><span className="hint">Shown to visitors in the cookie preferences and on the cookie policy page. Keep it accurate: it must match what the site really sets.</span>{can('cookies.write') && <button className="btn pri" onClick={() => setEd({ ...blankReg })}>+ Add cookie</button>}</div>
    <div className="card tw"><table><thead><tr><th>Name</th><th>Category</th><th>Provider</th><th>Purpose</th><th>Duration</th><th>Active</th><th /></tr></thead><tbody>{l.data.map((r: any) => <tr key={r.id}><td><b>{r.name}</b><div className="hint">{r.technology} · {r.party}-party {r.host}</div></td><td><Badge>{r.category_slug}</Badge></td><td>{r.provider}</td><td style={{ maxWidth: 300 }}>{r.purpose}</td><td>{r.duration}</td><td>{r.is_active ? 'Yes' : 'No'}</td>
      <td className="row"><button className="btn sm" onClick={() => setEd({ id: r.id, name: r.name, technology: r.technology, provider: r.provider, categorySlug: r.category_slug, purpose: r.purpose, duration: r.duration, party: r.party, host: r.host, service: r.service, requiresConsent: !!r.requires_consent, isActive: !!r.is_active })}>Edit</button>{can('cookies.write') && <button className="btn sm dng" onClick={async () => { if (!confirmBox('Remove from registry?')) return; try { await del('/cookies/registry/' + r.id); l.reload(); } catch (e) { toast.err(e); } }}>Remove</button>}</td></tr>)}</tbody></table></div>
    {ed && <Modal title={ed.id ? 'Edit cookie' : 'Add cookie'} onClose={() => setEd(null)} footer={<><button className="btn" onClick={() => setEd(null)}>Cancel</button><button className="btn pri" onClick={async () => { const { id, ...b } = ed; try { id ? await put('/cookies/registry/' + id, b) : await post('/cookies/registry', b); toast.ok('Saved'); setEd(null); l.reload(); } catch (e) { toast.err(e); } }}>Save</button></>}>
      <div className="grid g2"><Field label="Name"><input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field><Field label="Provider"><input value={ed.provider} onChange={(e) => setEd({ ...ed, provider: e.target.value })} /></Field>
        <Field label="Category"><select value={ed.categorySlug} onChange={(e) => setEd({ ...ed, categorySlug: e.target.value })}>{['necessary', 'functional', 'analytics', 'marketing', 'personalisation'].map((c) => <option key={c}>{c}</option>)}</select></Field><Field label="Technology"><select value={ed.technology} onChange={(e) => setEd({ ...ed, technology: e.target.value })}>{['cookie', 'local_storage', 'session_storage', 'other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Duration"><input value={ed.duration} onChange={(e) => setEd({ ...ed, duration: e.target.value })} /></Field><Field label="Party"><select value={ed.party} onChange={(e) => setEd({ ...ed, party: e.target.value })}><option>first</option><option>third</option></select></Field><Field label="Host / domain"><input value={ed.host} onChange={(e) => setEd({ ...ed, host: e.target.value })} /></Field><Field label="Service"><input value={ed.service} onChange={(e) => setEd({ ...ed, service: e.target.value })} /></Field></div>
      <Field label="Purpose"><textarea value={ed.purpose} onChange={(e) => setEd({ ...ed, purpose: e.target.value })} /></Field>
      <label className="row"><input type="checkbox" checked={ed.requiresConsent} onChange={(e) => setEd({ ...ed, requiresConsent: e.target.checked })} /> Requires consent</label><label className="row"><input type="checkbox" checked={ed.isActive} onChange={(e) => setEd({ ...ed, isActive: e.target.checked })} /> Active</label></Modal>}</>;
}
function Integrations() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/cookies/integrations'), []); const [v, setV] = useState<Record<string, any>>({});
  if (!l.data) return <Loading error={l.error} />;
  return <><Alert kind="info">Paste only the ID (not a script). The storefront loads these tags only after the visitor consents to the category shown. Leave disabled if you don’t use them.</Alert>
    {l.data.map((p: any) => { const cur = v[p.provider] ?? { value: p.value, enabled: p.enabled }; return <div className="card" key={p.provider}><div className="row sp"><b>{p.name}</b><Badge>{p.category}</Badge></div><div className="row"><div className="grow"><Field label={p.label} hint={`e.g. ${p.example}`}><input value={cur.value} onChange={(e) => setV({ ...v, [p.provider]: { ...cur, value: e.target.value } })} /></Field></div>
      <label className="row"><input type="checkbox" checked={cur.enabled} onChange={(e) => setV({ ...v, [p.provider]: { ...cur, enabled: e.target.checked } })} /> Enabled</label>
      {can('cookies.write') && <button className="btn pri" disabled={!v[p.provider]} onClick={async () => { try { await put('/cookies/integrations/' + p.provider, { value: cur.value, enabled: cur.enabled }); toast.ok('Saved'); setV((x) => { const n = { ...x }; delete n[p.provider]; return n; }); l.reload(); } catch (e) { toast.err(e); } }}>Save</button>}</div></div>; })}</>;
}
function Policy() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/cookies/policy'), []); const [f, setF] = useState<any>(null);
  if (!l.data) return <Loading error={l.error} />; const cur = l.data.current;
  const v = f ?? { body: cur.body ?? '', effectiveDate: new Date().toISOString().slice(0, 10), requiresReconsent: false };
  return <div className="grid g2" style={{ alignItems: 'start' }}><div className="card"><h3>Publish a new version (current: v{cur.version})</h3><Field label="Policy text (HTML)"><textarea style={{ minHeight: 280, fontFamily: 'monospace', fontSize: 13 }} value={v.body} onChange={(e) => setF({ ...v, body: e.target.value })} /></Field>
    <Field label="Effective date"><input type="date" value={v.effectiveDate} onChange={(e) => setF({ ...v, effectiveDate: e.target.value })} /></Field><label className="row"><input type="checkbox" checked={v.requiresReconsent} onChange={(e) => setF({ ...v, requiresReconsent: e.target.checked })} /> Ask all visitors to choose again (material change)</label>
    {can('cookies.write') && <div className="sticky-bar"><button className="btn pri" disabled={!f} onClick={async () => { if (!confirmBox('Publish a new cookie-policy version?')) return; try { await post('/cookies/policy', v); toast.ok('New version published'); setF(null); l.reload(); } catch (e) { toast.err(e); } }}>Publish new version</button></div>}</div>
    <div className="card"><h3>Version history</h3><table><thead><tr><th>Version</th><th>Effective</th><th>Re-consent</th><th>Created</th></tr></thead><tbody>{l.data.versions.map((x: any) => <tr key={x.id}><td>v{x.version} {x.is_published ? <Badge kind="ok">live</Badge> : ''}</td><td>{String(x.effective_date).slice(0, 10)}</td><td>{x.requires_reconsent ? 'Yes' : 'No'}</td><td>{when(x.created_at)}</td></tr>)}</tbody></table></div></div>;
}
function Consents() {
  const { can } = useAuth(); const toast = useToast(); const [off, setOff] = useState(0); const l = useLoad(() => get('/cookies/consents' + qs({ limit: 50, offset: off })), [off]);
  if (!l.data) return <Loading error={l.error} />; const rows = Array.isArray(l.data) ? l.data : l.data.rows ?? [];
  return <><div className="row sp" style={{ marginBottom: 10 }}><span className="hint">Pseudonymous records: a random consent ID and the choices. No IP address, name or email is stored.</span>{can('cookies.write') && <button className="btn" onClick={async () => { if (!confirmBox('Delete records older than the retention period?')) return; try { const r = await post('/cookies/purge'); toast.ok(`Deleted ${r.deleted} record(s)`); l.reload(); } catch (e) { toast.err(e); } }}>Purge expired records</button>}</div>
    <div className="card tw"><table><thead><tr><th>When</th><th>Action</th><th>Functional</th><th>Analytics</th><th>Marketing</th><th>Personalisation</th><th>Policy / config</th><th>Consent ID</th></tr></thead><tbody>{rows.map((r: any) => <tr key={r.id}><td>{when(r.created_at)}</td><td>{r.action.replace('_', ' ')}</td>{['functional', 'analytics', 'marketing', 'personalisation'].map((k) => <td key={k}>{r[k] ? '✓' : '—'}</td>)}<td>v{r.policy_version} / {r.config_version}</td><td><code>{String(r.consent_id).slice(0, 8)}…</code></td></tr>)}</tbody></table></div>
    <div className="row"><button className="btn sm" disabled={off === 0} onClick={() => setOff(Math.max(0, off - 50))}>← Newer</button><button className="btn sm" disabled={rows.length < 50} onClick={() => setOff(off + 50)}>Older →</button></div></>;
}
function Stats() {
  const [days, setDays] = useState(90); const l = useLoad(() => get('/cookies/stats?days=' + days), [days]);
  if (!l.data) return <Loading error={l.error} />; const d = l.data; const pct = (n: number) => (d.total ? Math.round((n / d.total) * 100) + '%' : '—');
  return <><select style={{ width: 160, marginBottom: 12 }} value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 30, 90, 365].map((x) => <option key={x} value={x}>Last {x} days</option>)}</select>
    <div className="grid g4"><div className="stat"><b>{d.total}</b><span>Choices recorded</span></div><div className="stat"><b>{d.visitors}</b><span>Unique visitors</span></div><div className="stat"><b>{pct(d.accept_all)}</b><span>Accept all</span></div><div className="stat"><b>{pct(d.reject_optional)}</b><span>Reject optional</span></div>
      <div className="stat"><b>{pct(d.custom)}</b><span>Custom</span></div><div className="stat"><b>{d.withdraw}</b><span>Withdrawals</span></div><div className="stat"><b>{pct(d.analytics)}</b><span>Allow analytics</span></div><div className="stat"><b>{pct(d.marketing)}</b><span>Allow marketing</span></div></div>
    <p className="hint">Aggregate numbers only; no individual is identifiable.</p></>;
}

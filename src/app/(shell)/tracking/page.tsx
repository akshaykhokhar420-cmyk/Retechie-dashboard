'use client';
import { useEffect, useState } from 'react';
import { get, put, post } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { PageHead, Field, Alert, Loading, Badge, useLoad } from '@/components/ui';

const PROVIDERS: [string, string, string][] = [
  ['none', 'Not connected', 'Customers only see the status you set by hand on each order.'],
  ['delhivery', 'Delhivery', 'Paste your Delhivery API token. Live scans appear on the Track page.'],
  ['shiprocket', 'Shiprocket', 'Use your Shiprocket API user email and password.'],
  ['custom', 'Other courier (any API)', 'Works with any courier that has a JSON tracking API — you tell us the URL and where the fields are.'],
];
const EMPTY: any = { provider: 'none', apiKey: '', email: '', password: '', baseUrl: '', url: '', method: 'GET', headers: '', body: '', map: { status: '', events: '', time: '', eventStatus: '', location: '', eta: '' } };

export default function Tracking() {
  const toast = useToast(); const l = useLoad(() => get('/tracking/config'), []); const [f, setF] = useState<any>(null); const [awb, setAwb] = useState(''); const [busy, setBusy] = useState(false); const [res, setRes] = useState<any>(null); const [err, setErr] = useState('');
  useEffect(() => { if (l.data) setF({ ...EMPTY, ...l.data, map: { ...EMPTY.map, ...(l.data.map ?? {}) } }); }, [l.data]);
  if (!f) return <Loading error={l.error} />;
  const set = (k: string, v: any) => setF({ ...f, [k]: v }); const setMap = (k: string, v: string) => setF({ ...f, map: { ...f.map, [k]: v } });
  const save = async () => { try { await put('/tracking/config', f); toast.ok('Tracking settings saved'); l.reload(); } catch (e) { toast.err(e); } };
  const test = async () => { setBusy(true); setErr(''); setRes(null); try { setRes(await post('/tracking/test', { awb: awb.trim(), config: f })); } catch (e: any) { setErr(e.message); } setBusy(false); };
  const p = f.provider;
  return <><PageHead title="Courier tracking" sub="Connect your courier's API so the Track page shows live scans — no manual updates."><button className="btn pri" onClick={save}>Save settings</button></PageHead>

    <div className="card"><h2>1. Choose your courier</h2><div className="prov">{PROVIDERS.map(([k, t, d]) => <button type="button" key={k} className={'pv-opt' + (p === k ? ' on' : '')} onClick={() => set('provider', k)}><b>{t}</b><span>{d}</span></button>)}</div></div>

    {p !== 'none' && <div className="card"><h2>2. API details</h2>
      {p === 'delhivery' && <><div className="grid g2"><Field label="API token" hint="Delhivery → Settings → API Setup"><input type="password" autoComplete="off" value={f.apiKey} onChange={(e) => set('apiKey', e.target.value)} /></Field><Field label="Base URL (optional)" hint="Leave empty for https://track.delhivery.com"><input value={f.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} /></Field></div></>}
      {p === 'shiprocket' && <div className="grid g2"><Field label="API user email" hint="Create a separate API user in Shiprocket → Settings → API"><input value={f.email} onChange={(e) => set('email', e.target.value)} /></Field><Field label="API user password"><input type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} /></Field></div>}
      {p === 'custom' && <><div className="grid g2"><Field label="Tracking URL" hint="Use {awb} where the tracking number goes, and {apiKey} for your key"><input value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://api.yourcourier.com/track?awb={awb}" /></Field><Field label="Method"><select value={f.method} onChange={(e) => set('method', e.target.value)}><option>GET</option><option>POST</option></select></Field>
        <Field label="API key / token" hint="Available as {apiKey} in the URL, headers and body"><input type="password" autoComplete="off" value={f.apiKey} onChange={(e) => set('apiKey', e.target.value)} /></Field>
        <Field label="Headers (one per line)"><textarea rows={3} value={f.headers} onChange={(e) => set('headers', e.target.value)} placeholder={'Authorization: Bearer {apiKey}'} /></Field></div>
        {f.method === 'POST' && <Field label="Request body"><textarea rows={3} value={f.body} onChange={(e) => set('body', e.target.value)} placeholder={'{"awb":"{awb}"}'} /></Field>}
        <h3 style={{ margin: '18px 0 4px' }}>Where is the data in the reply?</h3><p className="hint" style={{ marginBottom: 12 }}>Press “Test” below first — the raw reply is shown so you can copy the field names. Use dots for nesting, e.g. <code>data.scans</code>.</p>
        <div className="grid g3"><Field label="Overall status"><input value={f.map.status} onChange={(e) => setMap('status', e.target.value)} placeholder="data.status" /></Field><Field label="List of scan events"><input value={f.map.events} onChange={(e) => setMap('events', e.target.value)} placeholder="data.scans" /></Field><Field label="Expected delivery (optional)"><input value={f.map.eta} onChange={(e) => setMap('eta', e.target.value)} placeholder="data.edd" /></Field>
          <Field label="Event: time"><input value={f.map.time} onChange={(e) => setMap('time', e.target.value)} placeholder="time" /></Field><Field label="Event: status text"><input value={f.map.eventStatus} onChange={(e) => setMap('eventStatus', e.target.value)} placeholder="activity" /></Field><Field label="Event: location"><input value={f.map.location} onChange={(e) => setMap('location', e.target.value)} placeholder="location" /></Field></div></>}
    </div>}

    {p !== 'none' && <div className="card"><h2>3. Test with a real tracking number</h2><p className="hint">Use an AWB / tracking number from a recent shipment. Nothing is saved by testing.</p>
      <div className="row"><input style={{ maxWidth: 340 }} placeholder="Tracking number (AWB)" value={awb} onChange={(e) => setAwb(e.target.value)} /><button className="btn pri" disabled={busy || awb.trim().length < 3} onClick={test}>{busy ? 'Checking…' : 'Test'}</button></div>
      {err && <div style={{ marginTop: 12 }}><Alert kind="err">{err}</Alert></div>}
      {res && <div style={{ marginTop: 14 }}><div className="row" style={{ marginBottom: 10 }}><Badge kind={res.live.state === 'delivered' ? 'ok' : res.live.state === 'exception' ? 'err' : 'pri'}>{res.live.state.replace(/_/g, ' ')}</Badge><b>{res.live.statusText || '—'}</b>{res.live.eta && <span className="hint">ETA {res.live.eta}</span>}</div>
        {res.live.events.length ? <div className="kv">{res.live.events.slice(0, 8).map((e: any, i: number) => <div className="kv-r" key={i} style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}><span style={{ padding: '10px 14px' }}><b>{e.status}</b></span><span style={{ padding: '10px 14px' }} className="hint">{e.location}</span><span style={{ padding: '10px 14px' }} className="hint">{e.at}</span></div>)}</div> : <Alert kind="warn">The courier replied, but no scan events were found. {p === 'custom' ? 'Check the field names below.' : ''}</Alert>}
        <details style={{ marginTop: 12 }}><summary className="hint" style={{ cursor: 'pointer' }}>Show raw reply from the courier</summary><pre className="rawj">{JSON.stringify(res.raw, null, 2).slice(0, 6000)}</pre></details></div>}</div>}

    <div className="card"><h2>How it works</h2><ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}><li>When you ship an order, add the courier and tracking number on the order page (as before).</li><li>On the customer's Track page, we ask your courier for the latest scans and show them as a timeline. Results are kept for 20 minutes so your API isn't hit on every refresh.</li><li>When the courier says “Delivered” or “Out for delivery”, the progress bar on the Track page moves automatically.</li></ol></div>
  </>;
}

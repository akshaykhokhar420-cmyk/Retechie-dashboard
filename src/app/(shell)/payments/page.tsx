'use client';
import { useEffect, useState } from 'react';
import { get, put, post } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Badge, Alert, Field, useLoad, Loading } from '@/components/ui';

type F = { k: string; label: string; secret?: boolean; hint?: string; select?: string[] };
const GW: { id: 'razorpay' | 'stripe' | 'paypal'; name: string; blurb: string; fields: F[]; events: string; steps: string[] }[] = [
  { id: 'razorpay', name: 'Razorpay', blurb: 'UPI, cards, netbanking, wallets and EMI in INR. Customers pay in a pop-up on your site.',
    fields: [{ k: 'key_id', label: 'Key ID', hint: 'Starts with rzp_test_ (test) or rzp_live_ (live). Razorpay Dashboard → Account & Settings → API Keys.' }, { k: 'key_secret', label: 'Key Secret', secret: true }, { k: 'webhook_secret', label: 'Webhook secret', secret: true, hint: 'The secret you type when creating the webhook (below). Any long random string.' }],
    events: 'payment.captured, payment.failed, order.paid', steps: ['Razorpay Dashboard → Account & Settings → Webhooks → Add new webhook.', 'Paste the Webhook URL below and a secret of your choice; paste the same secret here.', 'Tick events: payment.captured, payment.failed, order.paid.'] },
  { id: 'stripe', name: 'Stripe', blurb: 'Cards and local methods through Stripe\'s hosted checkout page (customer is redirected and returns to your site).',
    fields: [{ k: 'secret_key', label: 'Secret key', secret: true, hint: 'sk_test_… or sk_live_… (Developers → API keys).' }, { k: 'webhook_secret', label: 'Webhook signing secret', secret: true, hint: 'whsec_… shown after you create the endpoint.' }],
    events: 'checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired', steps: ['Stripe → Developers → Webhooks → Add endpoint.', 'Paste the Webhook URL below and select the events listed.', 'Copy the signing secret (whsec_…) into the field here.'] },
  { id: 'paypal', name: 'PayPal', blurb: 'International customers. PayPal charges in a foreign currency, so set the currency and the INR conversion rate.',
    fields: [{ k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Client secret', secret: true }, { k: 'webhook_id', label: 'Webhook ID', hint: 'Shown on the webhook after you create it in the PayPal developer dashboard.' },
      { k: 'mode', label: 'Mode', select: ['sandbox', 'live'] }, { k: 'currency', label: 'Charge currency', hint: 'e.g. USD, EUR, GBP.' }, { k: 'rate', label: '1 INR = ? (in that currency)', hint: 'Example: 0.012 means ₹1,000 is charged as 12.00 USD. Update it when exchange rates move.' }],
    events: 'PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED', steps: ['developer.paypal.com → Apps & Credentials → your app → Add Webhook.', 'Paste the Webhook URL below; select PAYMENT.CAPTURE.COMPLETED and PAYMENT.CAPTURE.DENIED.', 'Copy the Webhook ID into the field here.'] },
];

export default function Payments() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/payments'), []);
  const [prov, setProv] = useState(''); const [vals, setVals] = useState<Record<string, any>>({}); const [busy, setBusy] = useState(false); const [tab, setTab] = useState<'razorpay' | 'stripe' | 'paypal'>('razorpay');
  useEffect(() => { if (l.data) { setProv(l.data.provider || ''); const v: any = {}; for (const g of GW) v[g.id] = { ...(l.data.gateways[g.id].config ?? {}) }; setVals(v); } }, [l.data]);
  if (!l.data) return <Loading error={l.error} />;
  const write = can('settings.write'); const gdef = GW.find((g) => g.id === tab)!; const info = l.data.gateways[tab]; const hook = `${l.data.webhookBase}/${tab}`;
  const set = (k: string, v: any) => setVals((x) => ({ ...x, [tab]: { ...x[tab], [k]: v } }));
  const save = async () => { setBusy(true); try { await put('/payments', { provider: prov, gateways: vals }); toast.ok('Payment settings saved'); l.reload(); } catch (e) { toast.err(e); } setBusy(false); };
  const test = async () => { setBusy(true); try { await put('/payments', { provider: l.data.provider || '', gateways: { [tab]: vals[tab] } }); const r: any = await post('/payments/test', { gateway: tab }); toast.ok(r.message); l.reload(); } catch (e) { toast.err(e); } setBusy(false); };
  return <><PageHead title="Online payments" sub="Connect Razorpay, Stripe or PayPal. One gateway is active at a time; customers pay on checkout and orders are confirmed only after the gateway's signed webhook arrives.">
    {write && <button className="btn pri" disabled={busy} onClick={save}>Save</button>}</PageHead>
    <Alert kind="info">Start with test keys. Card/UPI/EMI options at checkout appear only when <b>Settings → commerce → enabled_payment_methods</b> lists them (e.g. upi, card, cod). Secrets are never shown again after saving — leave •••••••• to keep the stored value.</Alert>
    <div className="sec" style={{ marginTop: 12 }}><div className="bd">
      <Field label="Active gateway" hint="A gateway can be made active only once all its credentials are filled in (the save will tell you what is missing). Choose “None” to switch online payment off (cash on delivery keeps working).">
        <select value={prov} disabled={!write} onChange={(e) => setProv(e.target.value)}><option value="">None — online payment off</option>{GW.map((g) => <option key={g.id} value={g.id} >{g.name}{l.data.gateways[g.id].configured ? '' : ' (save its keys below first)'}</option>)}</select></Field></div></div>
    <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>{GW.map((g) => <button key={g.id} className={'btn' + (tab === g.id ? ' pri' : '')} onClick={() => setTab(g.id)}>{g.name} {l.data.gateways[g.id].configured ? '✓' : ''}{prov === g.id && ' • active'}</button>)}</div>
    <div className="sec"><div className="hd"><b style={{ flex: 1 }}>{gdef.name}<div className="hint" style={{ fontWeight: 400 }}>{gdef.blurb}</div></b>{info.configured ? <Badge kind="ok">configured</Badge> : <Badge kind="warn">incomplete</Badge>}</div>
      <div className="bd">
        {gdef.fields.map((f) => <Field key={f.k} label={f.label} hint={f.hint}>
          {f.select ? <select disabled={!write} value={vals[tab]?.[f.k] ?? f.select[0]} onChange={(e) => set(f.k, e.target.value)}>{f.select.map((o) => <option key={o}>{o}</option>)}</select>
            : <input disabled={!write} type={f.secret ? 'password' : 'text'} autoComplete="off" value={vals[tab]?.[f.k] ?? ''} placeholder={f.secret ? 'paste to set / replace' : ''} onChange={(e) => set(f.k, e.target.value)} />}</Field>)}
        <h3 style={{ marginTop: 18 }}>Webhook setup</h3>
        <Field label="Webhook URL" hint="Must be reachable from the internet over HTTPS (use your live API domain; for local testing use a tunnel such as ngrok).">
          <input readOnly value={hook} onFocus={(e) => e.currentTarget.select()} /></Field>
        <ol className="hint" style={{ paddingLeft: 18 }}>{gdef.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <div className="hint">Events: <code>{gdef.events}</code></div>
        {write && <div className="sticky-bar"><button className="btn" disabled={busy} onClick={test}>Save &amp; test connection</button><button className="btn pri" disabled={busy} onClick={save}>Save</button></div>}
      </div></div></>;
}

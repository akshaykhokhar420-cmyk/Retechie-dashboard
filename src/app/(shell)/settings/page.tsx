'use client';
import { useState } from 'react';
import { get, put, post } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { JsonForm } from '@/components/JsonForm';
import { PageHead, Badge, Alert, useLoad, Loading } from '@/components/ui';

const HELP: Record<string, string> = { company: 'Business name, address, phone and email shown across the site.', offer: 'The home-page offer banner: coupon, countdown end date and wording.', commerce: 'Shipping fees, COD limits, GST rate, return window and warranty prices (amounts in rupees).', payments: 'Legacy signed-webhook secret only. Configure Razorpay / Stripe / PayPal under Online payments.', site: 'Site-wide switches such as maintenance mode.', branding: 'Logo, favicon and brand colours.' };
export default function Settings() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/settings'), []); const [open, setOpen] = useState<string | null>(null); const [vals, setVals] = useState<Record<string, any>>({}); const [q, setQ] = useState('');
  if (!l.data) return <Loading error={l.error} />;
  const rows = l.data.filter((s: any) => !s.key.startsWith('seo.') && !s.key.startsWith('cookies') && !/^payments\.(provider|razorpay|stripe|paypal)$/.test(s.key) && (!q || s.key.includes(q.toLowerCase()))); const groups = [...new Set(rows.map((s: any) => s.grp ?? s.group ?? 'general'))] as string[];
  return <><PageHead title="Settings" sub="Company details, offers, shipping, payments and site switches. Saving applies immediately." >
    <button className="btn" disabled={!can('settings.write')} onClick={async () => { try { await post('/revalidate'); toast.ok('Public site cache refreshed'); } catch (e) { toast.err(e); } }}>Refresh public site cache</button></PageHead>
    <Alert kind="info">SEO and cookie settings have their own sections. Secret values (passwords, keys) show as ••••••••; leave them unchanged to keep the stored value. The payment webhook secret and SMTP password are write-only: they are never sent back to the browser.</Alert>
    <input style={{ maxWidth: 260, marginBottom: 12 }} placeholder="Filter settings" value={q} onChange={(e) => setQ(e.target.value)} />
    {groups.map((g) => <div key={g}><h2 style={{ textTransform: 'capitalize', marginTop: 12 }}>{g}</h2>
      {rows.filter((s: any) => (s.grp ?? s.group ?? 'general') === g).map((s: any) => { const v = vals[s.key] ?? s.value; const isOpen = open === s.key; return <div className="sec" key={s.key}>
        <div className="hd" onClick={() => setOpen(isOpen ? null : s.key)}><b style={{ flex: 1 }}>{s.key}<div className="hint" style={{ fontWeight: 400 }}>{HELP[s.key]}</div></b>{s.is_public ? <Badge kind="pri">public</Badge> : <Badge>private</Badge>}{vals[s.key] && <Badge kind="warn">unsaved</Badge>}<span>{isOpen ? '▲' : '▼'}</span></div>
        {isOpen && <div className="bd"><JsonForm value={v} k={typeof v === 'object' && v ? '' : 'value'} onChange={(x) => setVals({ ...vals, [s.key]: x })} />
          {can('settings.write') && <div className="sticky-bar"><button className="btn pri" disabled={!vals[s.key]} onClick={async () => { try { await put('/settings/' + s.key, { value: vals[s.key] }); toast.ok('Saved'); setVals((x) => { const n = { ...x }; delete n[s.key]; return n; }); l.reload(); } catch (e) { toast.err(e); } }}>Save</button></div>}</div>}</div>; })}</div>)}</>;
}

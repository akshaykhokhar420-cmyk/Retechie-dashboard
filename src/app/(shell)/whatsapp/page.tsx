'use client';
import { useEffect, useState } from 'react';
import { get, put } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Alert, Field, useLoad, Loading } from '@/components/ui';

type QR = { label: string; message: string };
const DEF = {
  enabled: true, number: '', headerTitle: 'Retechie Support', status: '', welcome: 'Hi 👋 Welcome to Retechie!\nHow can we help you today?',
  hint: true, hintTitle: 'Need help choosing?', hintText: 'Chat with our team on WhatsApp', hintDelay: 5, placeholder: 'Type your message…',
  defaultMessage: 'Hi Retechie, I have a question.', side: 'right', appendPage: true, hideOn: '', mode: 'except', only: '', device: 'all',
  quick: [
    { label: 'Help me choose a laptop', message: 'Hi Retechie, I need help choosing a refurbished laptop.' },
    { label: 'Track my order', message: 'Hi Retechie, I want to know the status of my order.' },
    { label: 'Warranty / return query', message: 'Hi Retechie, I have a question about warranty or returns.' },
    { label: 'Talk to an expert', message: 'Hi Retechie, I would like to talk to an expert.' },
  ] as QR[],
};

export default function WhatsApp() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/settings'), []); const w = can('settings.write');
  const [f, setF] = useState<any>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (l.data) { const cur = l.data.find((s: any) => s.key === 'whatsapp')?.value; setF({ ...DEF, ...(cur || {}), quick: cur?.quick?.length ? cur.quick : DEF.quick }); } }, [l.data]);
  if (!f) return <Loading error={l.error} />;
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const company = l.data.find((s: any) => s.key === 'company')?.value ?? {};
  const digits = String(f.number || '').replace(/\D/g, '');
  const bad = f.number && !/^https?:\/\//.test(f.number) && digits.length < 10;
  const save = async () => {
    setBusy(true);
    try { await put('/settings/whatsapp', { value: { ...f, hintDelay: Number(f.hintDelay) || 5, quick: f.quick.filter((q: QR) => q.label.trim() && q.message.trim()) }, isPublic: true, group: 'general' }); toast.ok('WhatsApp chat saved'); l.reload(); }
    catch (e) { toast.err(e); }
    setBusy(false);
  };
  const setQ = (i: number, k: keyof QR, v: string) => set('quick', f.quick.map((q: QR, j: number) => (j === i ? { ...q, [k]: v } : q)));
  return <><PageHead title="WhatsApp chat" sub="The green WhatsApp button on your site. Change the number, texts, quick replies and where it shows. Changes go live within a minute.">
    {w && <button className="btn pri" disabled={busy || !!bad} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>}</PageHead>
    {bad && <Alert kind="err">Enter a valid WhatsApp number with country code, e.g. 919876543210.</Alert>}
    {!f.number && !(company.whatsapp || company.phone) && <Alert kind="warn">No number is set, so the WhatsApp button is hidden on the site. Add one below.</Alert>}
    <div className="card" style={{ padding: 16, display: 'grid', gap: 14 }}>
      <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={f.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Show the WhatsApp button on the site</label>
      <Field label="WhatsApp number" hint={`With country code, digits only (e.g. 919876543210). Leave empty to use the Settings → company ${company.whatsapp ? 'WhatsApp' : 'phone'} number${company.whatsapp || company.phone ? ` (${company.whatsapp || company.phone})` : ''}.`}><input value={f.number} onChange={(e) => set('number', e.target.value)} placeholder="919876543210" /></Field>
      <div className="fg2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Chat window title"><input value={f.headerTitle} onChange={(e) => set('headerTitle', e.target.value)} /></Field>
        <Field label="Status line" hint="Under the title, e.g. “Typically replies in minutes”. Empty = uses your business hours."><input value={f.status} onChange={(e) => set('status', e.target.value)} /></Field>
      </div>
      <Field label="Welcome message" hint="First message in the chat. New line = new line."><textarea rows={3} value={f.welcome} onChange={(e) => set('welcome', e.target.value)} /></Field>
    </div>
    <h3 style={{ margin: '22px 0 8px' }}>Quick replies</h3>
    <div className="card" style={{ padding: 16 }}>
      {f.quick.map((q: QR, i: number) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, marginBottom: 10, alignItems: 'end' }}>
        <Field label={`Button ${i + 1}`}><input value={q.label} onChange={(e) => setQ(i, 'label', e.target.value)} /></Field>
        <Field label="Message sent to WhatsApp"><input value={q.message} onChange={(e) => setQ(i, 'message', e.target.value)} /></Field>
        <button className="btn sm dn" onClick={() => set('quick', f.quick.filter((_: any, j: number) => j !== i))}>Remove</button></div>)}
      {f.quick.length < 6 && <button className="btn sm" onClick={() => set('quick', [...f.quick, { label: '', message: '' }])}>+ Add quick reply</button>}
    </div>
    <h3 style={{ margin: '22px 0 8px' }}>Pop-up hint & behaviour</h3>
    <div className="card" style={{ padding: 16, display: 'grid', gap: 14 }}>
      <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={f.hint} onChange={(e) => set('hint', e.target.checked)} /> Show a small hint bubble next to the button (once per visit)</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 14 }}>
        <Field label="Hint title"><input value={f.hintTitle} onChange={(e) => set('hintTitle', e.target.value)} /></Field>
        <Field label="Hint text"><input value={f.hintText} onChange={(e) => set('hintText', e.target.value)} /></Field>
        <Field label="Show after (sec)"><input type="number" min={1} max={120} value={f.hintDelay} onChange={(e) => set('hintDelay', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Typing box placeholder"><input value={f.placeholder} onChange={(e) => set('placeholder', e.target.value)} /></Field>
        <Field label="Message if the visitor sends an empty box"><input value={f.defaultMessage} onChange={(e) => set('defaultMessage', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Position"><select value={f.side} onChange={(e) => set('side', e.target.value)}><option value="right">Bottom right</option><option value="left">Bottom left</option></select></Field>
        <Field label="Show on devices"><select value={f.device} onChange={(e) => set('device', e.target.value)}><option value="all">Phone and computer</option><option value="mobile">Phone only</option><option value="desktop">Computer only</option></select></Field>
      </div>
      <Field label="Where to show the icon"><select value={f.mode} onChange={(e) => set('mode', e.target.value)}><option value="except">Every page, except the ones I list</option><option value="only">Only on the pages I list</option></select></Field>
      {f.mode === 'only'
        ? <Field label="Show only on these pages" hint="Comma-separated paths. A path also covers pages under it: /product covers every product. Use / for the home page only."><input value={f.only} onChange={(e) => set('only', e.target.value)} placeholder="/, /product, /contact" /></Field>
        : <Field label="Hide on these pages" hint="Comma-separated paths, e.g. /checkout, /cart"><input value={f.hideOn} onChange={(e) => set('hideOn', e.target.value)} placeholder="/checkout, /cart" /></Field>}
      <div className="row" style={{ flexWrap: 'wrap' }}>{[['/', 'Home'], ['/product', 'Products'], ['/collections', 'Categories'], ['/contact', 'Contact'], ['/cart', 'Cart'], ['/checkout', 'Checkout']].map(([p, n]) => <button key={p} type="button" className="btn sm" onClick={() => { const k = f.mode === 'only' ? 'only' : 'hideOn'; const cur = String(f[k] || '').split(',').map((x: string) => x.trim()).filter(Boolean); set(k, (cur.includes(p) ? cur.filter((x: string) => x !== p) : [...cur, p]).join(', ')); }}>{n} {p}</button>)}</div>
      <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={f.appendPage} onChange={(e) => set('appendPage', e.target.checked)} /> Add the page link to every message (so you know which product they were viewing)</label>
    </div></>;
}

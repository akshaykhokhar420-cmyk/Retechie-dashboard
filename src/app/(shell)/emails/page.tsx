'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { get, post, put, del, when, qs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/Confirm';
import { PageHead, Tabs, Badge, Alert, Modal, Field, Loading, Pager, useLoad, useDebounced } from '@/components/ui';

type Tab = 'events' | 'templates' | 'layout' | 'sending' | 'log';
const AUD: Record<string, string> = { visitor: 'Customer / visitor', team: 'Your team', user: 'The user', developer: 'Developers' };
const list = (s: string) => s.split(/[,;\s]+/).filter(Boolean);

export default function Emails() {
  const { can } = useAuth(); const toast = useToast(); const [tab, setTab] = useState<Tab>('events'); const o = useLoad(() => get('/emails/overview'), []); const canW = can('settings.write');
  const [edit, setEdit] = useState<number | null>(null);
  if (!o.data) return <><PageHead title="Emails" /><Loading error={o.error} /></>;
  const d = o.data;
  return <><PageHead title="Emails" sub="Every email Retechie sends — customer, team and developer — in one place." />
    {!d.smtpConfigured && <Alert kind="warn" dismissible={false}>Mail server is not set up yet, so emails are only logged. Open <b>Sending</b> to connect your mailbox.</Alert>}
    <Tabs tabs={[['events', 'Events'], ['templates', 'Templates'], ['layout', 'Brand layout'], ['sending', 'Sending'], ['log', 'Sent log']]} value={tab} onChange={setTab} />
    {tab === 'events' && <Events d={d} canW={canW} reload={o.reload} toast={toast} openTpl={(id: number) => { setEdit(id); setTab('templates'); }} />}
    {tab === 'templates' && <Templates d={d} canW={canW} reload={o.reload} toast={toast} edit={edit} setEdit={setEdit} />}
    {tab === 'layout' && <LayoutTab d={d} canW={canW} reload={o.reload} toast={toast} />}
    {tab === 'sending' && <Sending canW={canW} toast={toast} reload={o.reload} />}
    {tab === 'log' && <Log d={d} canW={canW} toast={toast} />}
  </>;
}

function Events({ d, canW, reload, toast, openTpl }: any) {
  const groups = useMemo(() => { const g: Record<string, any[]> = {}; for (const e of d.events) (g[e.group] ??= []).push(e); return g; }, [d]);
  const [sel, setSel] = useState<any>(null);
  const save = async (key: string, body: any) => { try { await put('/emails/events/' + key, body); toast.ok('Saved'); reload(); } catch (e: any) { toast.err(e); } };
  return <>{Object.entries(groups).map(([g, evs]) => <div key={g} className="card"><h3 style={{ marginTop: 0 }}>{g}</h3>
    <div className="tw"><table><thead><tr><th>Email</th><th>Goes to</th><th>Template</th><th>30 days</th><th>On</th><th /></tr></thead><tbody>
      {evs.map((e: any) => { const tpls = d.templates.filter((t: any) => t.event === e.key); const on = e.toggle ? (e.mapping.enabled ?? e.defaultOn) : true; const cur = tpls.find((t: any) => t.id === e.mapping.templateId) ?? tpls.find((t: any) => t.system);
        return <tr key={e.key}><td><b>{e.label}</b><div className="hint">{e.description}</div></td><td>{AUD[e.audience]}{(e.audience === 'team' || e.audience === 'developer') && <div className="hint">{(e.mapping.to?.length ? e.mapping.to : d.recipients.length ? d.recipients : ['company email']).join(', ')}</div>}</td>
          <td><select value={e.mapping.templateId ?? ''} disabled={!canW} onChange={(x) => save(e.key, { templateId: x.target.value ? Number(x.target.value) : undefined })}>{tpls.map((t: any) => <option key={t.id} value={t.system ? '' : t.id}>{t.name}{t.system ? ' (built-in)' : ''}</option>)}</select> <button className="btn sm" onClick={() => cur && openTpl(cur.id)}>Edit</button></td>
          <td><Badge kind="ok">{e.sent30} sent</Badge> {e.failed30 > 0 && <Badge kind="err">{e.failed30} failed</Badge>}</td>
          <td>{e.toggle ? <input type="checkbox" checked={on} disabled={!canW} onChange={(x) => save(e.key, { enabled: x.target.checked })} aria-label={'Enable ' + e.label} /> : <span className="hint">always</span>}</td>
          <td><button className="btn sm" onClick={() => setSel(e)}>Recipients…</button></td></tr>; })}
    </tbody></table></div></div>)}
    {sel && <Mapping e={sel} canW={canW} onClose={() => setSel(null)} onSave={async (b: any) => { await save(sel.key, b); setSel(null); }} />}
  </>;
}
function Mapping({ e, canW, onClose, onSave }: any) {
  const m = e.mapping; const s = (v?: string[]) => (v ?? []).join(', ');
  const [to, setTo] = useState(s(m.to)); const [cc, setCc] = useState(s(m.cc)); const [bcc, setBcc] = useState(s(m.bcc)); const [fromName, setFromName] = useState(m.fromName ?? e.defaultMapping.fromName ?? ''); const [replyTo, setReplyTo] = useState(m.replyTo ?? e.defaultMapping.replyTo ?? '');
  const team = e.audience === 'team' || e.audience === 'developer';
  return <Modal title={e.label} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Close</button>{canW && <button className="btn pri" onClick={() => onSave({ to: list(to), cc: list(cc), bcc: list(bcc), fromName, replyTo })}>Save</button>}</>}>
    <div style={{ display: 'grid', gap: 10 }}>
      {team ? <Field label="Send to" hint="Comma separated. Empty = the list in Sending, then your company email."><input value={to} onChange={(x) => setTo(x.target.value)} /></Field> : <p className="hint" style={{ margin: 0 }}>The recipient is the customer / user themselves.</p>}
      <Field label="CC"><input value={cc} onChange={(x) => setCc(x.target.value)} /></Field><Field label="BCC (e.g. a copy for your records)"><input value={bcc} onChange={(x) => setBcc(x.target.value)} /></Field>
      <Field label="Sender name" hint="You can use variables like {{lead.name}}."><input value={fromName} onChange={(x) => setFromName(x.target.value)} /></Field>
      <Field label="Reply-to" hint="An email address or one variable, e.g. {{lead.email}} so you can reply straight to the visitor."><input value={replyTo} onChange={(x) => setReplyTo(x.target.value)} /></Field>
    </div></Modal>;
}

function Templates({ d, canW, reload, toast, edit, setEdit }: any) {
  const [ask, box] = useConfirm();
  const dup = async (id: number) => { try { const r: any = await post(`/emails/templates/${id}/duplicate`); toast.ok('Duplicated'); reload(); setEdit(r.id); } catch (e: any) { toast.err(e); } };
  const rm = async (t: any) => { if (!(await ask(`Delete template “${t.name}”?`, { ok: 'Delete', danger: true }))) return; try { await del('/emails/templates/' + t.id); toast.ok('Deleted'); reload(); } catch (e: any) { toast.err(e); } };
  if (edit) return <Editor d={d} id={edit} canW={canW} toast={toast} onClose={() => { setEdit(null); reload(); }} />;
  return <>{box}<div className="row sp" style={{ marginBottom: 10 }}><span className="hint">Built-in templates can be edited or reset. Duplicate one to make a variant, then pick it in Events.</span>{canW && <NewTpl d={d} onCreate={(id: number) => { reload(); setEdit(id); }} toast={toast} />}</div>
    <div className="card tw"><table><thead><tr><th>Name</th><th>Event</th><th>Updated</th><th /></tr></thead><tbody>{d.templates.map((t: any) => <tr key={t.id}><td><b>{t.icon} {t.name}</b> {t.system && <Badge>built-in</Badge>}</td><td>{d.events.find((e: any) => e.key === t.event)?.label}</td><td>{when(t.updatedAt)}</td>
      <td className="row"><button className="btn sm" onClick={() => setEdit(t.id)}>{canW ? 'Edit' : 'View'}</button>{canW && <button className="btn sm" onClick={() => dup(t.id)}>Duplicate</button>}{canW && !t.system && <button className="btn sm danger" onClick={() => rm(t)}>Delete</button>}</td></tr>)}</tbody></table></div></>;
}
function NewTpl({ d, onCreate, toast }: any) {
  const [open, setOpen] = useState(false); const [ev, setEv] = useState(d.events[0].key); const [name, setName] = useState('');
  const go = async () => { try { const e = d.events.find((x: any) => x.key === ev); const base = d.templates.find((t: any) => t.event === ev && t.system); const full: any = await get('/emails/templates/' + base.id); const r: any = await post('/emails/templates', { ...full, name: name || e.label + ' (custom)', event: ev }); setOpen(false); onCreate(r.id); } catch (x: any) { toast.err(x); } };
  return <><button className="btn pri" onClick={() => setOpen(true)}>+ New template</button>{open && <Modal title="New template" onClose={() => setOpen(false)} footer={<button className="btn pri" onClick={go}>Create</button>}>
    <Field label="Which email is this for?"><select value={ev} onChange={(x) => setEv(x.target.value)}>{d.events.map((e: any) => <option key={e.key} value={e.key}>{e.group} · {e.label}</option>)}</select></Field><Field label="Name"><input value={name} onChange={(x) => setName(x.target.value)} placeholder="e.g. Festival sale confirmation" /></Field></Modal>}</>;
}
function Editor({ d, id, canW, toast, onClose }: any) {
  const [ask, box] = useConfirm(); const [t, setT] = useState<any>(null); const [pv, setPv] = useState<any>(null); const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { get('/emails/templates/' + id).then(setT).catch((e) => toast.err(e)); }, [id]); // eslint-disable-line
  const dt = useDebounced(t, 500);
  useEffect(() => { if (dt) post('/emails/preview', dt).then(setPv).catch(() => {}); }, [dt]);
  if (!t) return <Loading />; const ev = d.events.find((e: any) => e.key === t.event); const set = (k: string, v: any) => setT({ ...t, [k]: v });
  const ins = (k: string) => { const el = ta.current; const s = `{{${k}}}`; if (!el) return set('body', t.body + s); const a = el.selectionStart, b = el.selectionEnd; set('body', t.body.slice(0, a) + s + t.body.slice(b)); };
  const save = async () => { try { await put('/emails/templates/' + id, t); toast.ok('Template saved'); } catch (e: any) { toast.err(e); } };
  const test = async () => { try { const r: any = await post('/emails/test', t); toast.ok(r.status === 'sent' ? 'Test email sent to you' : 'Not sent: ' + (r.error || r.status)); } catch (e: any) { toast.err(e); } };
  const reset = async () => { if (!(await ask('Reset this built-in template to the original design? Your edits will be lost.', { ok: 'Reset', danger: true }))) return; try { await post(`/emails/templates/${id}/reset`); setT(await get('/emails/templates/' + id)); toast.ok('Reset'); } catch (e: any) { toast.err(e); } };
  return <>{box}<div className="row sp" style={{ marginBottom: 10 }}><button className="btn" onClick={onClose}>← All templates</button><div className="row">{canW && t.system && <button className="btn" onClick={reset}>Reset to original</button>}<button className="btn" onClick={test}>Send me a test</button>{canW && <button className="btn pri" onClick={save}>Save</button>}</div></div>
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <Field label="Template name"><input value={t.name} onChange={(x) => set('name', x.target.value)} /></Field>
        <Field label="Subject"><input value={t.subject} onChange={(x) => set('subject', x.target.value)} /></Field>
        <Field label="Preview text (shown next to the subject in the inbox)"><input value={t.preheader} onChange={(x) => set('preheader', x.target.value)} /></Field>
        <div className="grid g2"><Field label="Heading"><input value={t.headline} onChange={(x) => set('headline', x.target.value)} /></Field><Field label="Sub-heading"><input value={t.subheadline} onChange={(x) => set('subheadline', x.target.value)} /></Field></div>
        <div><span className="hint">Icon</span><div className="row" style={{ flexWrap: 'wrap' }}>{d.icons.map((i: string) => <button key={i} className={'btn sm ' + (t.icon === i ? 'pri' : '')} onClick={() => set('icon', t.icon === i ? '' : i)}>{i}</button>)}</div></div>
        <label className="row"><input type="checkbox" checked={t.useLayout} onChange={(x) => set('useLayout', x.target.checked)} /> Wrap in the Retechie brand layout (header, footer)</label>
        <Field label="Message (HTML — tables, buttons and images are allowed; scripts are removed)"><textarea ref={ta} rows={14} style={{ fontFamily: 'monospace', fontSize: 12.5 }} value={t.body} onChange={(x) => set('body', x.target.value)} /></Field>
        <div><span className="hint">Click to insert a variable at the cursor</span><div className="row" style={{ flexWrap: 'wrap' }}>{[...ev.vars, ...d.common.filter((c: any) => !['layout.accent', 'layout.button_text', 'deck.url'].includes(c.key))].map((v: any) => <button key={v.key} className="btn sm" title={v.label} onClick={() => ins(v.key)}>{`{{${v.key}}}`}</button>)}</div></div>
      </div>
      <div className="card"><div className="hint" style={{ marginBottom: 6 }}>Live preview (sample data) — <b>Subject:</b> {pv?.subject}</div>
        <iframe title="Email preview" sandbox="" srcDoc={pv?.html || ''} style={{ width: '100%', height: 640, border: '1px solid var(--line,#ddd)', borderRadius: 8, background: '#fff' }} /></div>
    </div></>;
}

function LayoutTab({ d, canW, reload, toast }: any) {
  const [L, setL] = useState<any>(d.layout); const set = (k: string, v: any) => setL({ ...L, [k]: v }); const [deckUrl, setDeckUrl] = useState(d.deck?.url ?? ''); const [deckName, setDeckName] = useState(d.deck?.name ?? '');
  const [pv, setPv] = useState<any>(null);
  useEffect(() => { const t = setTimeout(() => { const tpl = d.templates.find((x: any) => x.event === 'order.shipped' && x.system); if (tpl) get('/emails/templates/' + tpl.id).then((f: any) => post('/emails/preview', { ...f, layout: L })).then(setPv).catch(() => {}); }, 500); return () => clearTimeout(t); }, [L]); // eslint-disable-line
  const save = async () => { try { await put('/emails/layout', L); toast.ok('Layout saved'); reload(); } catch (e: any) { toast.err(e); } };
  const saveDeck = async (clear = false) => { try { await put('/emails/deck', clear ? { url: '' } : { url: deckUrl, name: deckName }); toast.ok(clear ? 'Deck removed' : 'Deck saved'); if (clear) { setDeckUrl(''); setDeckName(''); } reload(); } catch (e: any) { toast.err(e); } };
  return <div className="grid g2" style={{ alignItems: 'start' }}><div style={{ display: 'grid', gap: 12 }}>
    <div className="card" style={{ display: 'grid', gap: 10 }}><h3 style={{ margin: 0 }}>Brand layout</h3>
      <Field label="Logo text"><input value={L.logoText} onChange={(x) => set('logoText', x.target.value)} /></Field><Field label="Tagline"><input value={L.tagline} onChange={(x) => set('tagline', x.target.value)} /></Field>
      <div className="grid g3"><Field label="Accent colour"><input type="color" value={L.accent} onChange={(x) => set('accent', x.target.value)} /></Field><Field label="Button text"><input type="color" value={L.buttonText} onChange={(x) => set('buttonText', x.target.value)} /></Field><Field label="Page background"><input type="color" value={L.background} onChange={(x) => set('background', x.target.value)} /></Field></div>
      <Field label="Header image (optional, https link)"><input value={L.headerImage} onChange={(x) => set('headerImage', x.target.value)} placeholder="https://…" /></Field>
      <Field label="Signature (used as {{layout.signature}})"><textarea rows={2} value={L.signature} onChange={(x) => set('signature', x.target.value)} /></Field><Field label="Footer note"><textarea rows={2} value={L.footer} onChange={(x) => set('footer', x.target.value)} /></Field>
      {canW && <button className="btn pri" onClick={save}>Save layout</button>}<p className="hint" style={{ margin: 0 }}>Phone, email, address and social links come from Settings → Company, so they stay in sync.</p></div>
    <div className="card" style={{ display: 'grid', gap: 10 }}><h3 style={{ margin: 0 }}>Company deck</h3><p className="hint" style={{ margin: 0 }}>Paste the https link of your PDF deck (upload it in Media first). It appears as a “View our company deck” button wherever <code>{'{{deck.button}}'}</code> is used.</p>
      <Field label="PDF link"><input value={deckUrl} onChange={(x) => setDeckUrl(x.target.value)} placeholder="https://…/deck.pdf" /></Field><Field label="Name"><input value={deckName} onChange={(x) => setDeckName(x.target.value)} /></Field>
      {canW && <div className="row"><button className="btn pri" onClick={() => saveDeck()}>Save deck</button>{d.deck && <button className="btn" onClick={() => saveDeck(true)}>Remove</button>}</div>}</div></div>
    <div className="card"><div className="hint" style={{ marginBottom: 6 }}>Preview</div><iframe title="Layout preview" sandbox="" srcDoc={pv?.html || ''} style={{ width: '100%', height: 640, border: '1px solid var(--line,#ddd)', borderRadius: 8, background: '#fff' }} /></div></div>;
}

function Sending({ canW, toast, reload }: any) {
  const r = useLoad(() => get('/emails/sending'), []); const [f, setF] = useState<any>(null); const [rec, setRec] = useState(''); const [pre, setPre] = useState(''); const [pass, setPass] = useState('');
  useEffect(() => { if (r.data) { setF(r.data.smtp ?? { host: '', port: 465, secure: true, user: '', from: '', fromName: 'Retechie' }); setRec((r.data.recipients ?? []).join(', ')); setPre(r.data.subjectPrefix ?? ''); } }, [r.data]);
  if (!f) return <Loading error={r.error} />; const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const preset = (k: string) => { const p = r.data.presets[k]; if (p) setF({ ...f, host: p.host, port: p.port, secure: p.secure }); };
  const save = async () => { try { await put('/emails/sending', { smtp: { ...f, pass: pass || undefined }, recipients: list(rec), subjectPrefix: pre }); setPass(''); toast.ok('Saved'); r.reload(); reload(); } catch (e: any) { toast.err(e); } };
  const test = async () => { try { const t = (await get('/emails/overview')).templates.find((x: any) => x.event === 'dev.test'); const full: any = await get('/emails/templates/' + t.id); const x: any = await post('/emails/test', full); toast.ok(x.status === 'sent' ? 'Test email sent to your login email' : 'Not sent: ' + (x.error || x.status)); } catch (e: any) { toast.err(e); } };
  return <div className="card" style={{ display: 'grid', gap: 10, maxWidth: 720 }}><h3 style={{ margin: 0 }}>Mail server (SMTP)</h3>
    <div className="row" style={{ flexWrap: 'wrap' }}><span className="hint">Quick fill:</span>{Object.keys(r.data.presets).map((k: string) => <button key={k} className="btn sm" onClick={() => preset(k)}>{k.replace('_', ' ')}</button>)}</div>
    <div className="grid g2"><Field label="Server"><input value={f.host} onChange={(x) => set('host', x.target.value)} /></Field><Field label="Port"><select value={f.port} onChange={(x) => set('port', Number(x.target.value))}>{[465, 587, 25, 2525].map((p) => <option key={p}>{p}</option>)}</select></Field></div>
    <label className="row"><input type="checkbox" checked={f.secure} onChange={(x) => set('secure', x.target.checked)} /> Use SSL (usually on for port 465)</label>
    <div className="grid g2"><Field label="Username"><input value={f.user} onChange={(x) => set('user', x.target.value)} autoComplete="off" /></Field><Field label="Password" hint={r.data.smtp?.hasPassword ? 'A password is saved. Leave empty to keep it.' : 'Stored encrypted.'}><input type="password" value={pass} onChange={(x) => setPass(x.target.value)} autoComplete="new-password" /></Field></div>
    <div className="grid g2"><Field label="From address"><input value={f.from} onChange={(x) => set('from', x.target.value)} /></Field><Field label="From name"><input value={f.fromName} onChange={(x) => set('fromName', x.target.value)} /></Field></div>
    <Field label="Team / developer recipients" hint="Used for team and developer alerts when an event has no specific recipient."><input value={rec} onChange={(x) => setRec(x.target.value)} placeholder="you@company.com, dev@company.com" /></Field>
    <Field label="Subject prefix (optional)" hint="e.g. [Staging]"><input value={pre} onChange={(x) => setPre(x.target.value)} /></Field>
    {canW && <div className="row"><button className="btn pri" onClick={save}>Save</button><button className="btn" onClick={test}>Send test email to me</button></div>}</div>;
}

function Log({ d, canW, toast }: any) {
  const [ev, setEv] = useState(''); const [st, setSt] = useState(''); const [q, setQ] = useState(''); const dq = useDebounced(q); const [off, setOff] = useState(0); const [view, setView] = useState<any>(null);
  const r = useLoad(() => get('/emails/log' + qs({ event: ev, status: st, search: dq, limit: 25, offset: off })), [ev, st, dq, off]);
  const open = async (id: number) => { try { setView(await get('/emails/log/' + id)); } catch (e: any) { toast.err(e); } };
  const resend = async (id: number) => { try { await post(`/emails/log/${id}/resend`); toast.ok('Sent again'); setView(null); r.reload(); } catch (e: any) { toast.err(e); } };
  return <><div className="row" style={{ marginBottom: 10, flexWrap: 'wrap' }}><input placeholder="Search subject or address" value={q} onChange={(x) => { setQ(x.target.value); setOff(0); }} /><select value={ev} onChange={(x) => { setEv(x.target.value); setOff(0); }}><option value="">All emails</option>{d.events.map((e: any) => <option key={e.key} value={e.key}>{e.label}</option>)}</select><select value={st} onChange={(x) => { setSt(x.target.value); setOff(0); }}><option value="">Any status</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="skipped">Skipped</option></select></div>
    {!r.data ? <Loading error={r.error} /> : <div className="card tw"><table><thead><tr><th>When</th><th>Email</th><th>To</th><th>Subject</th><th>Status</th><th /></tr></thead><tbody>{r.data.rows.map((x: any) => <tr key={x.id}><td>{when(x.created_at)}</td><td>{d.events.find((e: any) => e.key === x.event)?.label ?? x.event}</td><td>{x.to.join(', ')}</td><td>{x.subject}{x.error && <div className="hint">{x.error}</div>}</td><td><Badge kind={x.status === 'sent' ? 'ok' : x.status === 'failed' ? 'err' : 'warn'}>{x.status}</Badge></td><td><button className="btn sm" onClick={() => open(x.id)}>View</button></td></tr>)}{!r.data.rows.length && <tr><td colSpan={6} className="hint">No emails yet.</td></tr>}</tbody></table><Pager total={r.data.total} limit={25} offset={off} onChange={setOff} /></div>}
    {view && <Modal title={view.subject} size="xl" onClose={() => setView(null)} footer={canW && !view.hidden && view.html ? <button className="btn pri" onClick={() => resend(view.id)}>Send again</button> : undefined}>
      <p className="hint">To: {view.to.join(', ')}{view.cc.length ? ' · CC: ' + view.cc.join(', ') : ''}{view.bcc.length ? ' · BCC: ' + view.bcc.join(', ') : ''} · {view.status}{view.error ? ' — ' + view.error : ''}</p>
      {view.hidden ? <Alert kind="info" dismissible={false}>This email contains a sign-in code, so its content is not kept.</Alert> : <iframe title="Sent email" sandbox="" srcDoc={view.html || ''} style={{ width: '100%', height: 520, border: '1px solid var(--line,#ddd)', borderRadius: 8, background: '#fff' }} />}</Modal>}</>;
}

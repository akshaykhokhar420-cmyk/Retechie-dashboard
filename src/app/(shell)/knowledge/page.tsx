'use client';
import { useEffect, useRef, useState } from 'react';
import { get, post, put, del, when, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/Confirm';
import { PageHead, Tabs, Badge, Alert, Modal, Field, Loading, useLoad } from '@/components/ui';

type Tab = 'overview' | 'studio' | 'flow' | 'docs';
export default function Knowledge() {
  const { can } = useAuth(); const toast = useToast(); const [tab, setTab] = useState<Tab>('overview'); const [seed, setSeed] = useState<string | null>(null); const canW = can('settings.write');
  const train = (q: string) => { setSeed(q); setTab('studio'); };
  return <><PageHead title="Knowledge Center" sub="Your website chatbot: what it knows, what it says, and the leads it collects." />
    <Tabs tabs={[['overview', 'Overview'], ['studio', 'Training Studio'], ['flow', 'Lead flow'], ['docs', 'Documents']]} value={tab} onChange={setTab} />
    {tab === 'overview' && <Overview canW={canW} toast={toast} train={train} />}
    {tab === 'studio' && <Studio canW={canW} toast={toast} seed={seed} clearSeed={() => setSeed(null)} />}
    {tab === 'flow' && <Flow canW={canW} toast={toast} />}
    {tab === 'docs' && <Docs canW={canW} toast={toast} />}
  </>;
}

function Stat({ label, value, sub }: any) { return <div className="card"><div className="hint">{label}</div><div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>{sub && <div className="hint">{sub}</div>}</div>; }
function Overview({ canW, toast, train }: any) {
  const [range, setRange] = useState('30d'); const a = useLoad(() => get('/kb/analytics?range=' + range), [range]); const l = useLoad(() => get('/kb/leads'), []);
  const sync = async () => { try { const r: any = await post('/kb/sync'); toast.ok(`Index rebuilt (${r.chunks} chunks)`); a.reload(); } catch (e: any) { toast.err(e); } };
  const setSt = async (id: number, status: string) => { try { await put('/kb/leads/' + id, { status }); l.reload(); } catch (e: any) { toast.err(e); } };
  if (!a.data) return <Loading error={a.error} />; const d = a.data;
  return <>
    <div className="row sp" style={{ marginBottom: 10 }}><div className="row">{['7d', '30d', '90d'].map((r) => <button key={r} className={'btn sm ' + (range === r ? 'pri' : '')} onClick={() => setRange(r)}>{r.replace('d', ' days')}</button>)}</div>{canW && <button className="btn" onClick={sync}>Rebuild knowledge index ({d.chunks} chunks)</button>}</div>
    <div className="grid g4"><Stat label="Questions asked" value={d.total} /><Stat label="Answer rate" value={d.answerRate == null ? '—' : d.answerRate + '%'} sub={`${d.answered} answered`} /><Stat label="HOT leads" value={d.leads.hot} sub={`${d.leads.warm} warm · ${d.leads.cold} cold`} /><Stat label="Unanswered" value={d.unanswered.length} sub="questions to train" /></div>
    <div className="grid g2" style={{ marginTop: 12, alignItems: 'start' }}>
      <div className="card"><h3 style={{ marginTop: 0 }}>Unanswered questions</h3>{!d.unanswered.length ? <p className="hint">Nothing unanswered — nice.</p> : d.unanswered.map((u: any) => <div key={u.q} className="row sp" style={{ padding: '6px 0', borderBottom: '1px solid var(--line,#eee)' }}><span>{u.q} <Badge>{u.n}×</Badge></span>{canW && <button className="btn sm" onClick={() => train(u.q)}>Train answer</button>}</div>)}</div>
      <div className="card"><h3 style={{ marginTop: 0 }}>Top questions</h3>{!d.top.length ? <p className="hint">No questions yet.</p> : d.top.map((u: any) => <div key={u.q} className="row sp" style={{ padding: '6px 0', borderBottom: '1px solid var(--line,#eee)' }}><span>{u.q}</span><span><Badge kind={u.answered ? 'ok' : 'warn'}>{u.n}×</Badge></span></div>)}</div>
    </div>
    <div className="card" style={{ marginTop: 12 }}><h3 style={{ marginTop: 0 }}>Chat leads</h3>
      {!l.data ? <Loading error={l.error} /> : !l.data.length ? <p className="hint">No leads yet. They appear here when a visitor finishes the chat and says yes to being contacted.</p> :
        <div className="tw"><table><thead><tr><th>When</th><th>Name</th><th>Contact</th><th>Interest</th><th>Score</th><th>Status</th></tr></thead><tbody>{l.data.map((x: any) => <tr key={x.id}><td>{when(x.created_at)}</td><td>{x.name || '—'}</td><td>{x.email}<div className="hint">{x.phone}</div></td><td>{x.service}<div className="hint">{x.answers?.usage}</div></td>
          <td><Badge kind={x.temperature === 'hot' ? 'err' : x.temperature === 'warm' ? 'warn' : undefined}>{x.temperature.toUpperCase()} · {x.score}</Badge></td>
          <td>{x.status === 'abandoned' ? <Badge>abandoned</Badge> : canW ? <select value={x.status} onChange={(e) => setSt(x.id, e.target.value)}><option>new</option><option>contacted</option><option>closed</option></select> : x.status}</td></tr>)}</tbody></table></div>}</div></>;
}

function Studio({ canW, toast, seed, clearSeed }: any) {
  const [ask, box] = useConfirm(); const s = useLoad(() => get('/kb/studio'), []); const [md, setMd] = useState<string | null>(null); const [warn, setWarn] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<{ me?: boolean; text: string; chips?: string[] }[]>([]); const [input, setInput] = useState(''); const [st, setSt] = useState<any>(null); const [dbg, setDbg] = useState<any>(null); const [hist, setHist] = useState(false); const [pub, setPub] = useState(false); const [summary, setSummary] = useState(''); const fileRef = useRef<HTMLInputElement>(null); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (s.data && md === null) { let m = s.data.md; if (seed) { m = m.replace(/\n*$/, '\n') + `\n## ${seed}\nkeywords: \nWrite the answer here.\n`; clearSeed(); toast.ok('Added a new answer block at the bottom — write the answer and Save.'); } setMd(m); setWarn(s.data.warnings); } }, [s.data]); // eslint-disable-line
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [msgs]);
  if (md === null) return <Loading error={s.error} />; const d = s.data;
  const save = async () => { try { const r: any = await put('/kb/studio', { md }); setWarn(r.warnings); toast.ok(r.warnings.length ? `Saved with ${r.warnings.length} warning(s)` : 'Draft saved'); s.reload(); } catch (e: any) { toast.err(e); } };
  const send = async (text: string) => { if (!text.trim()) return; setMsgs((m) => [...m, { me: true, text }]); setInput(''); try { const r: any = await post('/kb/studio/test', { md, message: text, state: st }); setSt(r.state); setDbg(r.debug); setMsgs((m) => [...m, { text: r.reply, chips: r.chips }]); } catch (e: any) { toast.err(e); } };
  const publish = async () => { try { await put('/kb/studio', { md }); const r: any = await post('/kb/studio/publish', { summary }); toast.ok('Published version ' + r.version); setPub(false); setSummary(''); s.reload(); } catch (e: any) { toast.err(e); } };
  const restore = async (v: number) => { if (!(await ask(`Restore version ${v}? It will be published immediately.`, { ok: 'Restore' }))) return; try { await post('/kb/studio/restore/' + v); const f: any = await get('/kb/studio'); setMd(f.md); toast.ok('Restored'); setHist(false); s.reload(); } catch (e: any) { toast.err(e); } };
  const reset = async () => { if (!(await ask('Reset the bot to the built-in Tixi knowledge? Your trained answers and wording are replaced and this goes live now (you can restore an older version from History).', { ok: 'Reset', danger: true }))) return; try { const r: any = await post('/kb/studio/reset'); setMd(r.md); toast.ok('Draft reset'); } catch (e: any) { toast.err(e); } };
  const upload = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => { setMd(String(r.result)); toast.ok('Loaded — review and Save'); }; r.readAsText(f); };
  const download = () => { const b = new Blob([md], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'retechie-knowledge.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const lines = md.split('\n').length;
  return <>{box}
    <div className="row sp" style={{ marginBottom: 10, flexWrap: 'wrap' }}><div className="row"><Badge kind={d.dirty ? 'warn' : 'ok'}>{d.dirty ? 'Unpublished changes' : 'Live = draft'}</Badge><span className="hint">Version {d.version}{d.publishedAt ? ' · ' + when(d.publishedAt) : ''}</span></div>
      <div className="row"><button className="btn" onClick={() => setHist(true)}>History</button><button className="btn" onClick={download}>Download .md</button>{canW && <><button className="btn" onClick={() => fileRef.current?.click()}>Upload .md</button><input ref={fileRef} type="file" accept=".md,.txt,text/markdown,text/plain" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} /><button className="btn" onClick={reset}>Reset to defaults</button><button className="btn" onClick={save}>Save draft</button><button className="btn pri" onClick={() => setPub(true)}>Publish</button></>}</div></div>
    {warn.length > 0 && <Alert kind="warn">{warn.map((w, i) => <div key={i}>{w}</div>)}</Alert>}
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="card" style={{ padding: 0, display: 'flex' }}>
        <pre aria-hidden style={{ margin: 0, padding: '10px 8px', textAlign: 'right', color: '#999', fontSize: 12.5, lineHeight: '1.5', userSelect: 'none', background: 'rgba(0,0,0,.03)' }}>{Array.from({ length: lines }, (_, i) => i + 1).join('\n')}</pre>
        <textarea value={md} readOnly={!canW} onChange={(e) => setMd(e.target.value)} spellCheck={false} aria-label="Knowledge markdown" style={{ flex: 1, minHeight: 640, border: 0, outline: 0, padding: 10, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12.5, lineHeight: '1.5', resize: 'vertical', background: 'transparent', color: 'inherit', whiteSpace: 'pre', overflow: 'auto' }} /></div>
      <div className="card"><div className="row sp"><b>Test chat (uses the draft)</b><button className="btn sm" onClick={() => { setMsgs([]); setSt(null); setDbg(null); }}>Start over</button></div>
        <div style={{ height: 420, overflow: 'auto', display: 'grid', gap: 8, alignContent: 'start', padding: '10px 0' }} aria-live="polite">
          {!msgs.length && <p className="hint">Type a message like “I need a quote” or “do you give a guarantee?”.</p>}
          {msgs.map((m, i) => <div key={i} style={{ justifySelf: m.me ? 'end' : 'start', maxWidth: '85%' }}><div style={{ background: m.me ? 'var(--pri,#3fbf5f)' : 'rgba(0,0,0,.06)', color: m.me ? '#fff' : 'inherit', padding: '8px 12px', borderRadius: 12, whiteSpace: 'pre-wrap' }}>{m.text}</div>{m.chips && <div className="row" style={{ flexWrap: 'wrap', marginTop: 4 }}>{m.chips.map((c) => <button key={c} className="btn sm" onClick={() => send(c)}>{c}</button>)}</div>}</div>)}<div ref={end} /></div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); send(input); }}><input style={{ flex: 1 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type as a visitor…" /><button className="btn pri">Send</button></form>
        {dbg && <details style={{ marginTop: 8 }}><summary className="hint">State &amp; extracted fields</summary><pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(dbg, null, 2)}</pre></details>}</div></div>
    {pub && <Modal title="Publish to the live chatbot" onClose={() => setPub(false)} footer={<button className="btn pri" onClick={publish}>Publish now</button>}><Field label="What changed? (for the history)"><input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Friendlier greeting, new delivery answer" /></Field></Modal>}
    {hist && <Modal title="Version history" onClose={() => setHist(false)}>{!d.history.length ? <p className="hint">Nothing published yet.</p> : d.history.map((h: any) => <div key={h.v} className="row sp" style={{ padding: '6px 0', borderBottom: '1px solid var(--line,#eee)' }}><span><b>v{h.v}</b> · {when(h.at)}<div className="hint">{h.summary}</div></span>{canW && <button className="btn sm" onClick={() => restore(h.v)}>Restore</button>}</div>)}</Modal>}</>;
}

function Flow({ canW, toast }: any) {
  const f = useLoad(() => get('/kb/lead-flow'), []); const [v, setV] = useState<any>(null); const [drag, setDrag] = useState<number | null>(null);
  useEffect(() => { if (f.data) setV(JSON.parse(JSON.stringify(f.data))); }, [f.data]);
  if (!v) return <Loading error={f.error} />;
  const setStep = (i: number, p: any) => setV({ ...v, steps: v.steps.map((s: any, j: number) => (j === i ? { ...s, ...p } : s)) });
  const move = (a: number, b: number) => { const s = [...v.steps]; const [x] = s.splice(a, 1); s.splice(b, 0, x); setV({ ...v, steps: s }); };
  const save = async () => { try { await put('/kb/lead-flow', v); toast.ok('Lead flow saved'); f.reload(); } catch (e: any) { toast.err(e); } };
  const max = v.steps.reduce((a: number, s: any) => a + (s.type === 'choice' && s.options ? Math.max(0, ...s.options.map((o: any) => o.points)) : s.points || 0), 0);
  return <><Alert kind="info" dismissible={false}>Visitors are asked these questions one at a time (skipping anything they already told the bot). The wording of each question is in the Training Studio as <code>## @ask &lt;key&gt;</code>. Saving here changes the live bot immediately.</Alert>
    {v.steps.map((s: any, i: number) => <div key={i} className="card" draggable={canW} onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag != null) move(drag, i); setDrag(null); }} style={{ display: 'grid', gap: 8 }}>
      <div className="row sp"><b>⠿ {i + 1}. {s.id}</b>{canW && <div className="row"><button className="btn sm" disabled={!i} onClick={() => move(i, i - 1)}>↑</button><button className="btn sm" disabled={i === v.steps.length - 1} onClick={() => move(i, i + 1)}>↓</button><button className="btn sm danger" onClick={() => setV({ ...v, steps: v.steps.filter((_: any, j: number) => j !== i) })}>Remove</button></div>}</div>
      <div className="grid g3"><Field label="Key"><input value={s.id} onChange={(e) => setStep(i, { id: e.target.value })} disabled={!canW} /></Field><Field label="Type"><select value={s.type} disabled={!canW} onChange={(e) => setStep(i, { type: e.target.value, ...(e.target.value === 'choice' && !s.options ? { options: [{ label: 'Option 1', points: 0 }] } : {}) })}><option value="choice">Choice</option><option value="text">Text</option><option value="email">Email</option><option value="phone">Phone</option></select></Field><label className="row" style={{ alignSelf: 'end' }}><input type="checkbox" checked={!!s.required} disabled={!canW} onChange={(e) => setStep(i, { required: e.target.checked })} /> Required</label></div>
      {s.type === 'choice' ? <>{s.source === 'services' ? <p className="hint" style={{ margin: 0 }}>Options come from your visible product categories.{canW && <> <button className="btn sm" onClick={() => setStep(i, { source: undefined, options: [{ label: 'Option 1', points: 0 }] })}>Use my own options</button></>}</p> :
        <>{(s.options ?? []).map((o: any, k: number) => <div key={k} className="row"><input style={{ flex: 1 }} value={o.label} disabled={!canW} onChange={(e) => setStep(i, { options: s.options.map((x: any, j: number) => (j === k ? { ...x, label: e.target.value } : x)) })} /><input type="number" style={{ width: 80 }} value={o.points} disabled={!canW} onChange={(e) => setStep(i, { options: s.options.map((x: any, j: number) => (j === k ? { ...x, points: Number(e.target.value) } : x)) })} aria-label="Points" /><span className="hint">pts</span>{canW && <button className="btn sm" onClick={() => setStep(i, { options: s.options.filter((_: any, j: number) => j !== k) })}>✕</button>}</div>)}{canW && <div className="row"><button className="btn sm" onClick={() => setStep(i, { options: [...(s.options ?? []), { label: '', points: 0 }] })}>+ Option</button><button className="btn sm" onClick={() => setStep(i, { source: 'services', options: undefined })}>Use categories instead</button></div>}</>}</> :
        <Field label="Points for answering"><input type="number" style={{ width: 100 }} value={s.points ?? 0} disabled={!canW} onChange={(e) => setStep(i, { points: Number(e.target.value) })} /></Field>}
    </div>)}
    {canW && <div className="row" style={{ marginBottom: 12 }}><button className="btn" onClick={() => setV({ ...v, steps: [...v.steps, { id: 'question' + (v.steps.length + 1), type: 'text', required: false, points: 0 }] })}>+ Add question</button></div>}
    <div className="card"><h3 style={{ marginTop: 0 }}>Scoring</h3><div className="row" style={{ flexWrap: 'wrap' }}><Field label="HOT from (points)"><input type="number" style={{ width: 100 }} value={v.hot} disabled={!canW} onChange={(e) => setV({ ...v, hot: Number(e.target.value) })} /></Field><Field label="WARM from (points)"><input type="number" style={{ width: 100 }} value={v.warm} disabled={!canW} onChange={(e) => setV({ ...v, warm: Number(e.target.value) })} /></Field></div>
      <p className="hint">Best possible score with these questions: <b>{max}</b>. A lead is <b>HOT</b> at {v.hot}+, <b>WARM</b> at {v.warm}+, otherwise COLD.</p>{canW && <button className="btn pri" onClick={save}>Save lead flow</button>}</div></>;
}

function Docs({ canW, toast }: any) {
  const [ask, box] = useConfirm(); const d = useLoad(() => get('/kb/documents'), []); const [busy, setBusy] = useState(false); const ref = useRef<HTMLInputElement>(null);
  const upload = async (f?: File) => { if (!f) return; setBusy(true); try { const fd = new FormData(); fd.append('file', f); const r: any = await api('POST', '/kb/documents', undefined, { form: fd }); toast.ok(`Added (${r.chunks} chunks)`); d.reload(); } catch (e: any) { toast.err(e); } setBusy(false); };
  const rm = async (x: any) => { if (!(await ask(`Remove “${x.name}” from the chatbot’s knowledge?`, { ok: 'Remove', danger: true }))) return; try { await del('/kb/documents/' + x.id); toast.ok('Removed'); d.reload(); } catch (e: any) { toast.err(e); } };
  return <>{box}<div className="card"><div className="row sp"><div><b>Documents</b><div className="hint">Upload PDF, DOCX, TXT or MD (up to 10 MB). The text is added to what the chatbot can answer from.</div></div>{canW && <><button className="btn pri" disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Reading…' : '+ Upload document'}</button><input ref={ref} type="file" hidden accept=".pdf,.docx,.txt,.md" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} /></>}</div>
    {!d.data ? <Loading error={d.error} /> : !d.data.length ? <p className="hint">No documents yet.</p> : <div className="tw"><table><thead><tr><th>Name</th><th>Size</th><th>Chunks</th><th>Added</th><th /></tr></thead><tbody>{d.data.map((x: any) => <tr key={x.id}><td>{x.name}</td><td>{Math.round(x.bytes / 1024)} KB</td><td>{x.chunks}</td><td>{when(x.created_at)}</td><td>{canW && <button className="btn sm danger" onClick={() => rm(x)}>Remove</button>}</td></tr>)}</tbody></table></div>}</div></>;
}

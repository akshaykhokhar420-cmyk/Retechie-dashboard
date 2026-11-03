'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { get, put, post, del, qs, when } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Tabs, Badge, Modal, Pager, useDebounced, useLoad, Loading, Alert, Field, confirmBox } from '@/components/ui';

type Row = { id: number; key: string; page: string; section: string; kind: string; label: string; default_value: string; published_value: string | null; draft_value: string | null; status: string; version: number; updated_at: string };

function Editor() {
  const sp = useSearchParams(); const toast = useToast(); const { can } = useAuth();
  const [tab, setTab] = useState<'all' | 'missing'>(sp.get('tab') === 'missing' ? 'missing' : 'all');
  const [q, setQ] = useState(''); const dq = useDebounced(q); const [page, setPage] = useState(''); const [section, setSection] = useState(''); const [status, setStatus] = useState(''); const [off, setOff] = useState(0);
  const facets = useLoad(() => get('/content/facets'), []);
  const list = useLoad(() => get<{ total: number; rows: Row[] }>('/content' + qs({ q: dq, page, section, status, limit: 40, offset: off })), [dq, page, section, status, off]);
  const [edits, setEdits] = useState<Record<number, string>>({}); const [hist, setHist] = useState<Row | null>(null); const [adding, setAdding] = useState<{ key: string } | null>(null);
  useEffect(() => { setOff(0); }, [dq, page, section, status]);
  const cur = (r: Row) => edits[r.id] ?? r.draft_value ?? r.published_value ?? r.default_value ?? '';

  async function save(r: Row) { try { await put('/content/' + r.id, { value: edits[r.id] }); toast.ok('Draft saved'); setEdits((e) => { const n = { ...e }; delete n[r.id]; return n; }); list.reload(); facets.reload(); } catch (e) { toast.err(e); } }
  async function discard(r: Row) { try { await del(`/content/${r.id}/draft`); setEdits((e) => { const n = { ...e }; delete n[r.id]; return n; }); list.reload(); facets.reload(); } catch (e) { toast.err(e); } }
  async function publish(ids: number[] | 'all') { if (ids !== 'all' && !ids.length) return; if (ids === 'all' && !confirmBox('Publish ALL drafts to the live site?')) return; try { const r = await post('/content/publish', { ids }); toast.ok(`Published ${r.published ?? r.count ?? ''} change(s)`.trim()); list.reload(); facets.reload(); } catch (e) { toast.err(e); } }

  const drafts = facets.data?.pages.reduce((n: number, p: any) => n + Number(p.drafts || 0), 0) ?? 0;
  const sections = (facets.data?.sections ?? []).filter((s: any) => !page || s.page === page);
  return <>
    <PageHead title="Text & labels" sub="Every word on the public site. Edits are saved as drafts; publish to make them live.">
      {can('content.write') && <button className="btn" onClick={() => setAdding({ key: '' })}>+ New key</button>}
      {can('content.publish') && <button className="btn pri" disabled={!drafts} onClick={() => publish('all')}>Publish all drafts ({drafts})</button>}
    </PageHead>
    <Tabs tabs={[['all', 'All content'], ['missing', 'Missing content']]} value={tab} onChange={setTab} />
    {tab === 'missing' ? <Missing onCreate={(k) => setAdding({ key: k })} /> : <>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="grow" placeholder="Search by key, label or text…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search content" />
        <select style={{ width: 170 }} value={page} onChange={(e) => { setPage(e.target.value); setSection(''); }}><option value="">All pages</option>{facets.data?.pages.map((p: any) => <option key={p.page} value={p.page}>{p.page} ({p.n})</option>)}</select>
        <select style={{ width: 170 }} value={section} onChange={(e) => setSection(e.target.value)}><option value="">All sections</option>{sections.map((s: any) => <option key={s.page + s.section} value={s.section}>{s.section || '(none)'} ({s.n})</option>)}</select>
        <select style={{ width: 130 }} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option><option value="draft">Has draft</option><option value="published">Published</option></select>
      </div>
      {!list.data ? <Loading error={list.error} /> : <>
        <div className="hint" style={{ marginBottom: 8 }}>{list.data.total} entries</div>
        {list.data.rows.map((r) => { const dirty = edits[r.id] !== undefined; const long = r.kind === 'rich' || cur(r).length > 80 || cur(r).includes('\n');
          return <div className="card" key={r.id} style={{ padding: 12, marginBottom: 8 }}>
            <div className="row sp" style={{ marginBottom: 6 }}><div><b>{r.label || r.key}</b> <span className="hint">{r.key}</span></div>
              <div className="row"><Badge>{r.page}{r.section ? ' · ' + r.section : ''}</Badge>{r.draft_value != null && <Badge kind="warn">draft</Badge>}<Badge>{r.kind}</Badge></div></div>
            {long ? <textarea value={cur(r)} onChange={(e) => setEdits({ ...edits, [r.id]: e.target.value })} /> : <input value={cur(r)} onChange={(e) => setEdits({ ...edits, [r.id]: e.target.value })} />}
            {r.kind === 'rich' && <div className="hint">HTML allowed: b, i, em, strong, a, br, p, ul, ol, li.</div>}
            <div className="row" style={{ marginTop: 8 }}>
              {can('content.write') && <button className="btn sm pri" disabled={!dirty} onClick={() => save(r)}>Save draft</button>}
              {can('content.publish') && r.draft_value != null && !dirty && <button className="btn sm" onClick={() => publish([r.id])}>Publish</button>}
              {can('content.write') && (dirty || r.draft_value != null) && <button className="btn sm" onClick={() => (dirty ? setEdits((e) => { const n = { ...e }; delete n[r.id]; return n; }) : discard(r))}>{dirty ? 'Undo edit' : 'Discard draft'}</button>}
              <button className="btn sm" onClick={() => setHist(r)}>History</button><span className="hint">v{r.version} · {when(r.updated_at)}</span></div>
          </div>; })}
        <Pager total={list.data.total} limit={40} offset={off} onChange={setOff} /></>}
    </>}
    {hist && <History row={hist} onClose={() => setHist(null)} onRestored={() => { setHist(null); list.reload(); facets.reload(); }} />}
    {adding && <Add init={adding.key} onClose={() => setAdding(null)} onDone={() => { setAdding(null); list.reload(); facets.reload(); }} />}
  </>;
}

function Missing({ onCreate }: { onCreate: (k: string) => void }) {
  const m = useLoad(() => get('/content/missing'), []);
  if (!m.data) return <Loading error={m.error} />;
  return m.data.length ? <><Alert kind="warn">These keys were requested by the public site but have no content. The site shows nothing for them until you create them.</Alert>
    <div className="card tw"><table><thead><tr><th>Key</th><th>Page</th><th>Times requested</th><th /></tr></thead><tbody>{m.data.map((r: any) => <tr key={r.key}><td><code>{r.key}</code></td><td>{r.page}</td><td>{r.hits}</td><td><button className="btn sm" onClick={() => onCreate(r.key)}>Create</button></td></tr>)}</tbody></table></div></>
    : <Alert kind="ok">No missing content. Every key the site asked for exists.</Alert>;
}
function History({ row, onClose, onRestored }: { row: Row; onClose: () => void; onRestored: () => void }) {
  const v = useLoad(() => get(`/content/${row.id}/versions`), [row.id]); const toast = useToast();
  return <Modal title={`History — ${row.key}`} onClose={onClose} size="lg">
    {!v.data ? <Loading error={v.error} /> : <table><thead><tr><th>Version</th><th>Value</th><th>Action</th><th>By</th><th>When</th><th /></tr></thead><tbody>{v.data.map((x: any) => <tr key={x.id}><td>{x.version}</td><td style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{x.value}</td><td>{x.action}</td><td>{x.author ?? '—'}</td><td>{when(x.created_at)}</td>
      <td><button className="btn sm" onClick={async () => { try { await post(`/content/${row.id}/restore`, { versionId: x.id }); toast.ok('Restored as a draft — publish to make it live'); onRestored(); } catch (e) { toast.err(e); } }}>Restore</button></td></tr>)}</tbody></table>}
  </Modal>;
}
function Add({ init, onClose, onDone }: { init: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast(); const [f, setF] = useState({ key: init, page: init.split('.')[0] || 'global', section: init.split('.')[1] || '', kind: 'text', label: '', value: '' });
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  return <Modal title="New content key" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={async () => { try { await post('/content', f); toast.ok('Created'); onDone(); } catch (e) { toast.err(e); } }}>Create</button></>}>
    <Field label="Key" hint="Letters, numbers, dots, dashes, e.g. home.hero.title. The site code must request this key to show it."><input value={f.key} onChange={(e) => set('key', e.target.value)} /></Field>
    <div className="grid g2"><Field label="Page"><input value={f.page} onChange={(e) => set('page', e.target.value)} /></Field><Field label="Section"><input value={f.section} onChange={(e) => set('section', e.target.value)} /></Field></div>
    <div className="grid g2"><Field label="Label"><input value={f.label} onChange={(e) => set('label', e.target.value)} /></Field><Field label="Type"><select value={f.kind} onChange={(e) => set('kind', e.target.value)}><option value="text">Text</option><option value="rich">Rich text</option><option value="url">URL</option><option value="number">Number</option></select></Field></div>
    <Field label="Value"><textarea value={f.value} onChange={(e) => set('value', e.target.value)} /></Field>
  </Modal>;
}
export default function ContentPage() { return <Suspense fallback={<Loading />}><Editor /></Suspense>; }

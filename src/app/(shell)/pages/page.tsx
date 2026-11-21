'use client';
import { askConfirm } from '@/components/Confirm';
import Link from 'next/link';
import { useState } from 'react';
import { get, post, del, openPreview } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Status, Badge, Modal, Field, useLoad, Loading } from '@/components/ui';

export default function Pages() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/pages'), []); const [add, setAdd] = useState(false); const [f, setF] = useState({ slug: '', title: '' });
  if (!l.data) return <Loading error={l.error} />;
  return <>
    <PageHead title="Pages & sections" sub="Build and reorder the sections of every page. Changes stay as drafts until you publish the page.">{can('pages.write') && <button className="btn pri" onClick={() => setAdd(true)}>+ New page</button>}</PageHead>
    <div className="card tw"><table><thead><tr><th>Page</th><th>URL</th><th>Status</th><th>Sections</th><th>Unpublished</th><th /></tr></thead><tbody>
      {l.data.map((p: any) => <tr key={p.id}><td><Link href={`/pages/${p.id}`}><b>{p.title}</b></Link></td><td><code>/{p.slug === 'home' ? '' : p.slug}</code></td><td><Status s={p.status} /></td><td>{p.section_count}</td><td>{p.draft_count ? <Badge kind="warn">{p.draft_count} draft</Badge> : '—'}</td>
        <td className="row"><Link className="btn sm" href={`/pages/${p.id}`}>Edit</Link><button className="btn sm" onClick={() => openPreview(p.slug === 'home' ? '/' : '/' + p.slug).catch(toast.err)}>Preview</button>
          {p.kind !== 'system' && can('pages.write') && <button className="btn sm dng" onClick={async () => { if (!await askConfirm(`Delete page "${p.title}"?`)) return; try { await del('/pages/' + p.id); l.reload(); } catch (e) { toast.err(e); } }}>Delete</button>}</td></tr>)}</tbody></table></div>
    {add && <Modal title="New page" onClose={() => setAdd(false)} footer={<><button className="btn" onClick={() => setAdd(false)}>Cancel</button><button className="btn pri" onClick={async () => { try { await post('/pages', f); setAdd(false); l.reload(); } catch (e) { toast.err(e); } }}>Create</button></>}>
      <Field label="Title"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field><Field label="URL slug" hint="Lowercase letters, numbers and dashes. Becomes /your-slug."><input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field></Modal>}
  </>;
}

'use client';
import { askConfirm } from '@/components/Confirm';
import { useState } from 'react';
import { get, post, put, del } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { MediaField } from '@/components/Media';
import { PageHead, Status, Modal, Field, useLoad, Loading } from '@/components/ui';

export default function Categories() {
  const { can } = useAuth(); const toast = useToast(); const l = useLoad(() => get('/categories'), []); const [ed, setEd] = useState<any>(null);
  if (!l.data) return <Loading error={l.error} />;
  return <><PageHead title="Categories">{can('categories.write') && <button className="btn pri" onClick={() => setEd({ name: '', slug: '', description: '', parentId: null, imageMediaId: null, position: l.data.length + 1, isVisible: true, status: 'published' })}>+ New category</button>}</PageHead>
    <div className="card tw"><table><thead><tr><th /><th>Name</th><th>Slug</th><th>Products</th><th>Order</th><th>Status</th><th /></tr></thead><tbody>{l.data.map((c: any) => <tr key={c.id}><td><div className="thumb" style={{ backgroundImage: c.image_url ? `url(${c.image_url})` : undefined }} /></td><td><b>{c.name}</b></td><td>{c.slug}</td><td>{c.product_count}</td><td>{c.position}</td><td><Status s={c.is_visible ? c.status : 'hidden'} /></td>
      <td className="row"><button className="btn sm" onClick={() => setEd({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? '', parentId: c.parent_id, imageMediaId: c.image_media_id, position: c.position, isVisible: !!c.is_visible, status: c.status })}>Edit</button>
        {can('categories.write') && <button className="btn sm dng" onClick={async () => { if (!await askConfirm(`Delete "${c.name}"?`)) return; try { await del('/categories/' + c.id); l.reload(); } catch (e) { toast.err(e); } }}>Delete</button>}</td></tr>)}</tbody></table></div>
    {ed && <Modal title={ed.id ? 'Edit category' : 'New category'} onClose={() => setEd(null)} footer={<><button className="btn" onClick={() => setEd(null)}>Cancel</button><button className="btn pri" onClick={async () => { const { id, ...b } = ed; try { id ? await put('/categories/' + id, b) : await post('/categories', b); toast.ok('Saved'); setEd(null); l.reload(); } catch (e) { toast.err(e); } }}>Save</button></>}>
      <div className="grid g2"><Field label="Name"><input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field><Field label="Slug" hint="Blank = from name"><input value={ed.slug} onChange={(e) => setEd({ ...ed, slug: e.target.value })} /></Field><Field label="Order"><input type="number" value={ed.position} onChange={(e) => setEd({ ...ed, position: Number(e.target.value) })} /></Field>
        <Field label="Status"><select value={ed.status} onChange={(e) => setEd({ ...ed, status: e.target.value })}><option>published</option><option>draft</option></select></Field></div>
      <Field label="Description"><textarea value={ed.description} onChange={(e) => setEd({ ...ed, description: e.target.value })} /></Field><MediaField label="Category image" value={ed.imageMediaId} onChange={(v) => setEd({ ...ed, imageMediaId: v })} />
      <label className="row"><input type="checkbox" checked={ed.isVisible} onChange={(e) => setEd({ ...ed, isVisible: e.target.checked })} /> Visible on the site</label></Modal>}</>;
}

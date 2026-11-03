'use client';
import { useState } from 'react';
import { get, post, put, when } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { PageHead, Tabs, Badge, Modal, Field, Alert, useLoad, Loading } from '@/components/ui';

export default function Users() {
  const toast = useToast(); const { me } = useAuth(); const [tab, setTab] = useState<'users' | 'roles'>('users'); const u = useLoad(() => get('/users'), []); const r = useLoad(() => get('/roles'), []); const [ed, setEd] = useState<any>(null);
  if (!u.data || !r.data) return <Loading error={u.error || r.error} />;
  return <><PageHead title="Users & roles"><button className="btn pri" onClick={() => setEd({ email: '', name: '', password: '', roles: ['content_editor'], isActive: true })}>+ New user</button></PageHead>
    <Tabs tabs={[['users', 'Users'], ['roles', 'Roles & permissions']]} value={tab} onChange={setTab} />
    {tab === 'users' ? <div className="card tw"><table><thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Active</th><th>Last sign-in</th><th /></tr></thead><tbody>{u.data.map((x: any) => <tr key={x.id}><td><b>{x.name}</b></td><td>{x.email}</td><td>{x.roles.map((s: string) => <Badge key={s} kind="pri">{s}</Badge>)}</td><td>{x.is_active ? 'Yes' : <Badge kind="err">No</Badge>}</td><td>{when(x.last_login_at)}</td><td><button className="btn sm" onClick={() => setEd({ id: x.id, email: x.email, name: x.name, password: '', roles: x.roles, isActive: !!x.is_active, self: x.id === me?.id })}>Edit</button></td></tr>)}</tbody></table></div>
      : <div className="card tw"><table><thead><tr><th>Permission</th>{r.data.roles.map((x: any) => <th key={x.id}>{x.name ?? x.slug}</th>)}</tr></thead><tbody>{r.data.permissions.map((p: any) => <tr key={p.slug}><td>{p.slug}<div className="hint">{p.description}</div></td>{r.data.roles.map((x: any) => <td key={x.id}>{x.permissions.includes(p.slug) ? '✓' : ''}</td>)}</tr>)}</tbody></table></div>}
    {ed && <Modal title={ed.id ? 'Edit user' : 'New user'} onClose={() => setEd(null)} footer={<><button className="btn" onClick={() => setEd(null)}>Cancel</button><button className="btn pri" onClick={async () => { const { id, self, ...b } = ed; if (!b.password) delete b.password; if (id) delete b.email; try { id ? await put('/users/' + id, b) : await post('/users', b); toast.ok('Saved'); setEd(null); u.reload(); } catch (e) { toast.err(e); } }}>Save</button></>}>
      <div className="grid g2"><Field label="Name"><input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field><Field label="Email"><input disabled={!!ed.id} value={ed.email} onChange={(e) => setEd({ ...ed, email: e.target.value })} /></Field></div>
      <Field label={ed.id ? 'New password (leave blank to keep)' : 'Password'} hint="10+ characters with upper and lower case letters and a number. Changing it signs the user out."><input type="password" autoComplete="new-password" value={ed.password} onChange={(e) => setEd({ ...ed, password: e.target.value })} /></Field>
      <Field label="Roles">{r.data.roles.map((x: any) => <label key={x.id} className="row" style={{ marginBottom: 4 }}><input type="checkbox" checked={ed.roles.includes(x.slug)} onChange={(e) => setEd({ ...ed, roles: e.target.checked ? [...ed.roles, x.slug] : ed.roles.filter((s: string) => s !== x.slug) })} /> <b>{x.name ?? x.slug}</b> <span className="hint">{x.description}</span></label>)}</Field>
      <label className="row"><input type="checkbox" disabled={ed.self} checked={ed.isActive} onChange={(e) => setEd({ ...ed, isActive: e.target.checked })} /> Active</label>{ed.self && <Alert kind="info">You cannot remove your own access.</Alert>}</Modal>}</>;
}

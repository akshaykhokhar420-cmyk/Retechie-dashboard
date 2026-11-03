'use client';
import { useState } from 'react';
import { get, qs, when } from '@/lib/api';
import { PageHead, Pager, useLoad, Loading } from '@/components/ui';

export default function Audit() {
  const [off, setOff] = useState(0); const [entity, setEntity] = useState(''); const l = useLoad(() => get('/audit' + qs({ entity, limit: 50, offset: off })), [entity, off]);
  return <><PageHead title="Audit log" sub="Who changed what. Secrets and passwords are never recorded." />
    <input style={{ maxWidth: 260, marginBottom: 12 }} placeholder="Filter by type (product, content, seo…)" value={entity} onChange={(e) => { setEntity(e.target.value); setOff(0); }} />
    {!l.data ? <Loading error={l.error} /> : <><div className="card tw"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Item</th><th>Detail</th></tr></thead><tbody>{l.data.rows.map((a: any) => <tr key={a.id}><td>{when(a.created_at)}</td><td>{a.admin ?? 'system'}</td><td>{a.action}</td><td>{a.entity_type} {a.entity_id}</td><td style={{ maxWidth: 380, wordBreak: 'break-word' }}><code style={{ fontSize: 11.5 }}>{a.detail ? (typeof a.detail === 'string' ? a.detail : JSON.stringify(a.detail)).slice(0, 220) : ''}</code></td></tr>)}</tbody></table></div><Pager total={l.data.total} limit={50} offset={off} onChange={setOff} /></>}</>;
}

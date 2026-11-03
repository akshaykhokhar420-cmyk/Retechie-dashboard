'use client';
import { useState } from 'react';
import { get, post } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { PageHead, Field, Alert, useLoad } from '@/components/ui';

function TwoFactor() {
  const toast = useToast(); const st = useLoad(() => get('/auth/2fa'), []); const [setup, setSetup] = useState<any>(null); const [code, setCode] = useState(''); const [codes, setCodes] = useState<string[] | null>(null); const [pw, setPw] = useState('');
  if (!st.data) return null;
  return <div className="card" style={{ maxWidth: 480 }}><h2>Two-factor authentication</h2>
    {codes ? <><Alert kind="ok">Two-factor authentication is ON. Save these recovery codes somewhere safe. Each works once and they are shown only now.</Alert><pre className="code">{codes.join('\n')}</pre><button className="btn" onClick={() => { setCodes(null); st.reload(); }}>I saved them</button></>
    : st.data.enabled ? <><p className="hint">Enabled. {st.data.recoveryLeft} recovery code(s) left.</p><Field label="Password"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field><Field label="Current code"><input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
      <button className="btn" disabled={!pw || code.length < 6} onClick={async () => { try { await post('/auth/2fa/disable', { password: pw, code }); toast.ok('Two-factor authentication turned off'); setPw(''); setCode(''); st.reload(); } catch (e) { toast.err(e); } }}>Turn off</button></>
    : setup ? <><p className="hint">Add this key in Google Authenticator, Microsoft Authenticator or Authy (choose "enter a setup key", time-based), then type the 6-digit code.</p><pre className="code" style={{ wordBreak: 'break-all' }}>{setup.secret}</pre><Field label="6-digit code"><input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
      <button className="btn pri" disabled={code.length < 6} onClick={async () => { try { const r = await post<any>('/auth/2fa/enable', { code }); setCodes(r.recoveryCodes); setSetup(null); setCode(''); } catch (e) { toast.err(e); } }}>Confirm and turn on</button></>
    : <><p className="hint">Adds a second step at sign-in using an authenticator app. Strongly recommended for admin accounts.</p><button className="btn pri" onClick={async () => { try { setSetup(await post('/auth/2fa/setup')); } catch (e) { toast.err(e); } }}>Set up</button></>}
  </div>;
}

export default function Account() {
  const { me } = useAuth(); const toast = useToast(); const [f, setF] = useState({ current: '', next: '', again: '' });
  const bad = f.next && (f.next.length < 10 || !/[a-z]/.test(f.next) || !/[A-Z]/.test(f.next) || !/\d/.test(f.next));
  return <><PageHead title="My account" sub={`${me?.name} · ${me?.email} · ${me?.roles.join(', ')}`} />
    <div className="card" style={{ maxWidth: 480 }}><h2>Change password</h2>
      <Field label="Current password"><input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
      <Field label="New password" hint="10+ characters, with upper and lower case letters and a number"><input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
      <Field label="Repeat new password"><input type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></Field>
      {bad && <Alert kind="warn">That password is too weak.</Alert>}
      <button className="btn pri" disabled={!f.current || !f.next || !!bad || f.next !== f.again} onClick={async () => { try { await post('/auth/password', { current: f.current, next: f.next }); toast.ok('Password changed'); setF({ current: '', next: '', again: '' }); } catch (e) { toast.err(e); } }}>Change password</button></div>
    <TwoFactor />
    <div className="card" style={{ maxWidth: 480 }}><h3>Your permissions</h3><div className="hint">{me?.permissions.join(', ')}</div></div></>;
}

'use client';
import { useState } from 'react';
import { post, setCsrf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Alert } from '@/components/ui';

export default function Login() {
  const { refresh } = useAuth(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [code, setCode] = useState(''); const [need2fa, setNeed2fa] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await post<{ csrf: string }>('/auth/login', { email, password, ...(code ? { code } : {}) }); setCsrf(r.csrf); await refresh(); location.href = '/'; }
    catch (x: any) { if (x?.body?.code === 'totp_required') { setNeed2fa(true); setErr(''); } else setErr(x.message); } finally { setBusy(false); }
  }
  return <div className="login">
    <div className="art"><div className="brand" style={{ color: '#fff' }}><i>R</i>Retechie</div>
      <div><h2>Run your store from one calm place.</h2><p>Products, orders, invoices, pages and SEO — everything in one dashboard.</p></div>
      <div className="pts"><span>Orders and GST invoices on autopilot</span><span>Edit every page without touching code</span><span>Collections, city pages and SEO built in</span></div></div>
    <div className="pane"><form className="card" onSubmit={submit}>
      <h1 style={{ marginBottom: 4 }}>Welcome back</h1><p className="hint" style={{ margin: '0 0 18px' }}>Sign in to manage the store.</p>
      {err && <Alert kind="err">{err}</Alert>}
      <label className="f"><span>Email</span><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@retechie.com" /></label>
      <label className="f"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {need2fa && <label className="f"><span>Authenticator code</span><input inputMode="numeric" autoComplete="one-time-code" autoFocus required value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code or recovery code" /><small className="hint">Open your authenticator app and enter the current code.</small></label>}
      <button className="btn pri" disabled={busy} style={{ width: '100%', padding: '11px 15px' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form></div></div>;
}

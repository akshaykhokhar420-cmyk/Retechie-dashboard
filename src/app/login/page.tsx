'use client';
import { useState } from 'react';
import { post, setCsrf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Alert, Modal } from '@/components/ui';

export default function Login() {
  const { refresh } = useAuth(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [code, setCode] = useState(''); const [need2fa, setNeed2fa] = useState(false); const [show, setShow] = useState(false); const [help, setHelp] = useState(false);
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
      <label className="f"><span>Password</span><span style={{ position: 'relative', display: 'block' }}><input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', paddingRight: 44 }} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} title={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, padding: 6, cursor: 'pointer', color: 'inherit', opacity: 0.65, display: 'grid', placeItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{show ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}</svg></button></span></label>
      {need2fa && <label className="f"><span>Authenticator code</span><input inputMode="numeric" autoComplete="one-time-code" autoFocus required value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code or recovery code" /><small className="hint">Open your authenticator app and enter the current code.</small></label>}
      <button className="btn pri" disabled={busy} style={{ width: '100%', padding: '11px 15px' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <button type="button" className="btn" onClick={() => setHelp(true)} style={{ width: '100%', padding: '11px 15px', marginTop: 10, background: 'none', border: 0, boxShadow: 'none' }}>Forgot password?</button>
    </form>
    {help && <Modal title="Forgot your password?" onClose={() => setHelp(false)} footer={<button className="btn pri" onClick={() => setHelp(false)}>Got it</button>}>
      <p style={{ margin: '0 0 10px' }}>Ask the store owner (a super admin) to set a new password for you: <b>Users → your account → Edit → New password</b>. Then sign in with it and change it under <b>Account</b>.</p>
      <p className="hint" style={{ margin: 0 }}>If you are the only admin and locked out, the site developer can reset it from the server.</p>
    </Modal>}</div></div>;
}

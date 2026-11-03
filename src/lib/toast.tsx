'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
type T = { id: number; kind: 'ok' | 'err'; msg: string; ms: number; out?: boolean };
const C = createContext<{ ok: (m: string) => void; err: (e: unknown) => void }>({ ok() {}, err() {} });
export const useToast = () => useContext(C);
const SUB: Record<string, string> = { Saved: 'Your changes were saved successfully.' };
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<T[]>([]);
  const close = useCallback((id: number) => { setList((l) => l.map((x) => (x.id === id ? { ...x, out: true } : x))); setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 260); }, []);
  const push = useCallback((kind: T['kind'], msg: string) => { const id = Date.now() + Math.random(); const ms = kind === 'err' ? 7000 : 3200; setList((l) => [...l.slice(-3), { id, kind, msg, ms }]); setTimeout(() => close(id), ms); }, [close]);
  return <C.Provider value={{ ok: (m) => push('ok', m), err: (e) => push('err', e instanceof Error ? e.message : String(e)) }}>
    {children}
    <div className="toasts" role="status" aria-live="polite">{list.map((t) => <div key={t.id} className={'toast ' + t.kind + (t.out ? ' out' : '')} style={{ ['--ms' as any]: t.ms + 'ms' }}>
      <span className="ti">{t.kind === 'ok' ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 7v6M12 17h.01" /></svg>}</span>
      <div className="tx"><b>{t.kind === 'ok' ? t.msg : 'Something went wrong'}</b><span>{t.kind === 'ok' ? SUB[t.msg] ?? '' : t.msg}</span></div>
      <button className="tc" aria-label="Dismiss" onClick={() => close(t.id)}>×</button><i className="tp" /></div>)}</div>
  </C.Provider>;
}

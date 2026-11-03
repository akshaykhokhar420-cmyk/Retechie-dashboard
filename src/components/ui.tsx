'use client';
import { useEffect, useState, type ReactNode } from 'react';

export function Badge({ children, kind }: { children: ReactNode; kind?: 'ok' | 'warn' | 'err' | 'pri' }) { return <span className={'badge ' + (kind ?? '')}>{children}</span>; }
const KIND: Record<string, 'ok' | 'warn' | 'err' | 'pri'> = { published: 'ok', active: 'ok', paid: 'ok', delivered: 'ok', confirmed: 'pri', packed: 'pri', shipped: 'pri', draft: 'warn', pending: 'warn', unpaid: 'warn', open: 'warn', in_progress: 'pri', cancelled: 'err', failed: 'err', suspended: 'err', rejected: 'err', archived: 'err', returned: 'err', refunded: 'err', closed: 'ok', approved: 'ok' };
export const Status = ({ s }: { s?: string | null }) => (s ? <Badge kind={KIND[s]}>{s.replace(/_/g, ' ')}</Badge> : <>—</>);

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="f"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function Alert({ kind = 'info', children, dismissible = true }: { kind?: 'err' | 'warn' | 'ok' | 'info'; children: ReactNode; dismissible?: boolean }) {
  const [gone, setGone] = useState(false); if (gone) return null;
  return <div className={'alert ' + kind} role={kind === 'err' ? 'alert' : undefined}><div style={{ flex: 1, minWidth: 0 }}>{children}</div>{dismissible && <button type="button" onClick={() => setGone(true)} aria-label="Dismiss" title="Dismiss" style={{ flex: 'none', background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: 16, lineHeight: 1, opacity: .65, padding: '2px 4px', marginLeft: 6 }}>✕</button>}</div>;
}

export function Modal({ title, onClose, children, size, footer }: { title: string; onClose: () => void; children: ReactNode; size?: 'lg' | 'xl'; footer?: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="ovl" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={'mdl ' + (size ?? '')} role="dialog" aria-modal="true" aria-label={title}>
      <div className="row sp" style={{ marginBottom: 12 }}><h2 style={{ margin: 0 }}>{title}</h2><button className="btn sm" onClick={onClose} aria-label="Close">✕</button></div>
      {children}{footer && <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>{footer}</div>}
    </div></div>;
}
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (t: T) => void }) {
  return <div className="tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={k === value} className={k === value ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
export function Pager({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (o: number) => void }) {
  if (total <= limit) return null;
  return <div className="row" style={{ marginTop: 10 }}><button className="btn sm" disabled={offset <= 0} onClick={() => onChange(Math.max(0, offset - limit))}>← Prev</button><span className="hint">{offset + 1}–{Math.min(total, offset + limit)} of {total}</span><button className="btn sm" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>Next →</button></div>;
}
export function useDebounced<T>(v: T, ms = 300) { const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]); return d; }
export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return <div className="top"><div><h1>{title}</h1>{sub && <div className="hint">{sub}</div>}</div><div className="sp" />{children}</div>;
}
export function Loading({ error }: { error?: string | null }) {
  return error ? <Alert kind="err">{error}</Alert> : <div aria-busy="true" aria-label="Loading" style={{ display: 'grid', gap: 14 }}>
    <div className="sk" style={{ height: 34, width: 240 }} /><div className="grid g4">{[0, 1, 2, 3].map((i) => <div key={i} className="sk" style={{ height: 92 }} />)}</div><div className="sk" style={{ height: 260 }} /></div>;
}
export function Empty({ title, text, children }: { title: string; text?: string; children?: ReactNode }) { return <div className="empty"><b>{title}</b>{text}{children && <div style={{ marginTop: 14 }}>{children}</div>}</div>; }

/** Loads data and exposes reload. */
export function useLoad<T>(fn: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState<string | null>(null); const [n, setN] = useState(0);
  useEffect(() => { let live = true; setError(null); fn().then((d) => live && setData(d)).catch((e) => live && setError(e.message)); return () => { live = false; }; /* eslint-disable-next-line */ }, [...deps, n]);
  return { data, error, reload: () => setN((x) => x + 1), set: setData };
}
export const confirmBox = (m: string) => typeof window !== 'undefined' && window.confirm(m);

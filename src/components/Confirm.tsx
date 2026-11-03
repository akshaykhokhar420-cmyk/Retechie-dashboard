'use client';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Modal } from './ui';

/** In-app confirmation modal (never window.confirm). Usage: const [ask, box] = useConfirm(); if (await ask('Delete?')) …; render {box}. */
export function useConfirm(): [(msg: string, o?: { ok?: string; danger?: boolean; typed?: string }) => Promise<boolean>, ReactNode] {
  const [s, setS] = useState<{ msg: string; ok: string; danger: boolean; typed?: string } | null>(null); const [t, setT] = useState('');
  const res = useRef<((v: boolean) => void) | null>(null);
  const ask = useCallback((msg: string, o: { ok?: string; danger?: boolean; typed?: string } = {}) => new Promise<boolean>((r) => { res.current = r; setT(''); setS({ msg, ok: o.ok ?? 'Confirm', danger: !!o.danger, typed: o.typed }); }), []);
  const done = (v: boolean) => { res.current?.(v); res.current = null; setS(null); };
  const node = s ? <Modal title="Please confirm" onClose={() => done(false)} footer={<><button className="btn" onClick={() => done(false)}>Cancel</button><button className={'btn ' + (s.danger ? 'danger' : 'pri')} disabled={!!s.typed && t !== s.typed} onClick={() => done(true)}>{s.ok}</button></>}>
    <p style={{ margin: 0 }}>{s.msg}</p>{s.typed && <label className="f" style={{ marginTop: 10 }}><span>Type <b>{s.typed}</b> to continue</span><input value={t} onChange={(e) => setT(e.target.value)} autoFocus /></label>}
  </Modal> : null;
  return [ask, node];
}

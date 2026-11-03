'use client';
import { useEffect, useRef, useState } from 'react';

const RATIOS: [string, number | null][] = [['Original', null], ['1:1', 1], ['4:3', 4 / 3], ['3:2', 3 / 2], ['16:9', 16 / 9], ['4:5', 4 / 5]];

/** Browser-side editor: rotate, flip, crop (aspect + zoom + position), brightness/contrast. Returns the edited file via onSave. */
export default function ImageEditor({ src, name, mime, onSave, onCancel }: { src: string; name: string; mime: string; onSave: (f: File) => Promise<void> | void; onCancel: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [rot, setRot] = useState(0); const [fh, setFh] = useState(false); const [fv, setFv] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null); const [zoom, setZoom] = useState(1); const [px, setPx] = useState(0.5); const [py, setPy] = useState(0.5);
  const [br, setBr] = useState(100); const [ct, setCt] = useState(100);
  useEffect(() => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => setImg(i); i.onerror = () => setErr('Could not load the image for editing.'); i.src = src + (src.includes('?') ? '&' : '?') + 'edit=' + Date.now(); }, [src]);

  /** Draw the transformed full image to an offscreen canvas, then crop. */
  function render(target: HTMLCanvasElement, maxW: number) {
    if (!img) return;
    const swap = rot % 180 !== 0; const W = swap ? img.naturalHeight : img.naturalWidth; const H = swap ? img.naturalWidth : img.naturalHeight;
    const full = document.createElement('canvas'); full.width = W; full.height = H; const c = full.getContext('2d')!;
    c.filter = `brightness(${br}%) contrast(${ct}%)`; c.translate(W / 2, H / 2); c.rotate((rot * Math.PI) / 180); c.scale(fh ? -1 : 1, fv ? -1 : 1); c.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    let cw = W, ch = H; if (ratio) { if (W / H > ratio) cw = H * ratio; else ch = W / ratio; }
    cw /= zoom; ch /= zoom; const sx = (W - cw) * px, sy = (H - ch) * py;
    const k = Math.min(1, maxW / cw); target.width = Math.round(cw * k); target.height = Math.round(ch * k);
    target.getContext('2d')!.drawImage(full, sx, sy, cw, ch, 0, 0, target.width, target.height);
  }
  useEffect(() => { if (cv.current) render(cv.current, 760); });

  async function save() {
    if (!img) return; setBusy(true);
    try {
      const out = document.createElement('canvas'); render(out, 3000);
      const type = mime === 'image/png' || mime === 'image/webp' ? mime : 'image/jpeg';
      const blob: Blob = await new Promise((ok, no) => out.toBlob((b) => (b ? ok(b) : no(new Error('Export failed'))), type, 0.92));
      await onSave(new File([blob], name.replace(/\.[a-z0-9]+$/i, '') + (type === 'image/png' ? '.png' : type === 'image/webp' ? '.webp' : '.jpg'), { type }));
    } catch (e: any) { setErr(e?.message || 'Could not save'); } finally { setBusy(false); }
  }
  const reset = () => { setRot(0); setFh(false); setFv(false); setRatio(null); setZoom(1); setPx(.5); setPy(.5); setBr(100); setCt(100); };
  const Sl = ({ l, v, set, min, max, step = 1, fmt }: any) => <label style={{ display: 'grid', gap: 2, fontSize: 12.5 }}><span style={{ display: 'flex', justifyContent: 'space-between' }}><span>{l}</span><b>{fmt ? fmt(v) : v}</b></span><input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(+e.target.value)} /></label>;
  return <div className="ie">
    <style>{`.ie{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(220px,1fr);gap:18px}.ie-stage{background:repeating-conic-gradient(var(--line2) 0 25%,var(--card) 0 50%) 0 0/16px 16px;border:1px solid var(--line);border-radius:12px;display:flex;align-items:center;justify-content:center;min-height:300px;padding:10px}.ie-stage canvas{max-width:100%;max-height:420px;border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,.2)}.ie-side{display:grid;gap:12px;align-content:start}.ie-side h4{margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}.ie-chips{display:flex;flex-wrap:wrap;gap:6px}@media(max-width:800px){.ie{grid-template-columns:1fr}}`}</style>
    <div className="ie-stage">{err ? <span style={{ color: 'var(--err)' }}>{err}</span> : img ? <canvas ref={cv} /> : <span className="hint">Loading…</span>}</div>
    <div className="ie-side">
      <h4>Transform</h4>
      <div className="ie-chips"><button className="btn sm" onClick={() => setRot((rot + 270) % 360)}>⟲ Rotate left</button><button className="btn sm" onClick={() => setRot((rot + 90) % 360)}>⟳ Rotate right</button><button className="btn sm" onClick={() => setFh(!fh)}>⇋ Flip H</button><button className="btn sm" onClick={() => setFv(!fv)}>⇅ Flip V</button></div>
      <h4>Crop</h4>
      <div className="ie-chips">{RATIOS.map(([l, r]) => <button key={l} className={'btn sm ' + (ratio === r ? 'pri' : '')} onClick={() => { setRatio(r); setPx(.5); setPy(.5); }}>{l}</button>)}</div>
      <Sl l="Zoom" v={zoom} set={setZoom} min={1} max={4} step={0.05} fmt={(v: number) => v.toFixed(2) + '×'} />
      <Sl l="Position ↔" v={px} set={setPx} min={0} max={1} step={0.01} fmt={(v: number) => Math.round(v * 100) + '%'} />
      <Sl l="Position ↕" v={py} set={setPy} min={0} max={1} step={0.01} fmt={(v: number) => Math.round(v * 100) + '%'} />
      <h4>Adjust</h4>
      <Sl l="Brightness" v={br} set={setBr} min={50} max={150} fmt={(v: number) => v + '%'} /><Sl l="Contrast" v={ct} set={setCt} min={50} max={150} fmt={(v: number) => v + '%'} />
      <div className="row" style={{ marginTop: 4 }}><button className="btn pri" disabled={!img || busy} onClick={save}>{busy ? 'Saving…' : 'Save edited image'}</button><button className="btn" onClick={reset}>Reset</button><button className="btn" onClick={onCancel}>Cancel</button></div>
      <p className="hint" style={{ margin: 0 }}>Saving replaces the image everywhere it is used.</p>
    </div>
  </div>;
}

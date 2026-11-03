'use client';
import { MediaField } from './Media';

const isMedia = (k: string) => /MediaId$/.test(k);
const human = (k: string) => k.replace(/MediaId$/, ' image').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase());
const TPL: Record<string, any> = { extraLinks: { title: '', url: '', note: '' }, sameAs: '', items: undefined };
const blank = (v: any): any => Array.isArray(v) ? [] : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)])) : typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : isMedia('') ? null : '';

/**
 * Schema-less recursive editor for page-section configs and structured settings.
 * Strings → text / textarea (…Html keys are rich text), *MediaId → media picker, arrays → add / remove / reorder rows.
 */
export function JsonForm({ value, onChange, k = '' }: { value: any; onChange: (v: any) => void; k?: string }) {
  if (isMedia(k)) return <MediaField label={human(k)} value={typeof value === 'number' ? value : null} onChange={onChange} />;
  if (typeof value === 'boolean') return <label className="f"><span><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {human(k)}</span></label>;
  if (typeof value === 'number') return <label className="f"><span>{human(k)}</span><input type="number" value={value} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} /></label>;
  if (value == null || typeof value === 'string') {
    const s = value ?? ''; const rich = /Html$/.test(k); const long = rich || s.length > 70 || s.includes('\n') || /(body|text|description|subtitle|summary|answer|quote)$/i.test(k);
    return <label className="f"><span>{human(k)}{rich && ' (HTML: b, i, a, br, ul, li, p allowed)'}</span>{long ? <textarea value={s} onChange={(e) => onChange(e.target.value)} /> : <input value={s} onChange={(e) => onChange(e.target.value)} />}</label>;
  }
  if (Array.isArray(value)) {
    const scalar = value.every((x) => typeof x !== 'object' || x === null);
    const tpl = value.length ? blank(value[0]) : TPL[k] !== undefined ? TPL[k] : scalar ? '' : {};
    const move = (i: number, d: number) => { const a = [...value]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
    return <div><div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{human(k)} <span className="hint">({value.length})</span></div>
      <div className="jf">{value.map((it, i) => <div className="item" key={i}>
        <div className="row" style={{ marginBottom: 6, justifyContent: 'flex-end' }}><button type="button" className="btn sm" onClick={() => move(i, -1)} aria-label="Move up">↑</button><button type="button" className="btn sm" onClick={() => move(i, 1)} aria-label="Move down">↓</button><button type="button" className="btn sm dng" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button></div>
        <JsonForm value={it} k={scalar ? k + '_item' : ''} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} /></div>)}
        <button type="button" className="btn sm" onClick={() => onChange([...value, JSON.parse(JSON.stringify(tpl))])}>+ Add item</button></div></div>;
  }
  if (typeof value === 'object') {
    return <div className={k ? 'jf' : ''}>{k && <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{human(k)}</div>}
      {Object.entries(value).filter(([kk]) => !((kk === 'variant' || kk === 'slot') && !k)).map(([kk, vv]) => <JsonForm key={kk} k={kk} value={vv} onChange={(nv) => onChange({ ...value, [kk]: nv })} />)}</div>;
  }
  return null;
}

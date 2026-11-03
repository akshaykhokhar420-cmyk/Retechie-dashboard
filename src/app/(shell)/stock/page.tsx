'use client';
import { useState } from 'react';
import { get, post, put, del, qs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import Icon from '@/components/Icon';
import { PageHead, Field, Badge, Pager, Modal, Loading, useLoad, useDebounced } from '@/components/ui';

const inr = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN');
const day = (d: any) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const iso = (d: any) => (d ? String(d).slice(0, 10) : '');
const today = () => new Date().toISOString().slice(0, 10);
const TABS: [string, string][] = [['', 'All machines'], ['in_stock', 'In stock'], ['sold', 'Sold'], ['returned', 'Returned'], ['defective', 'Defective'], ['in_qc', 'In QC'], ['in_repair', 'In repair']];
const KIND: Record<string, any> = { in_stock: 'ok', sold: 'pri', returned: 'warn', defective: 'err', in_qc: 'warn', in_repair: 'warn' };
const LABEL: Record<string, string> = { in_stock: 'In stock', sold: 'Sold', returned: 'Returned', defective: 'Defective', in_qc: 'In QC', in_repair: 'In repair' };

export default function Stock() {
  const { can } = useAuth(); const toast = useToast(); const w = can('products.write');
  const [view, setView] = useState<'units' | 'vendors'>('units'); const [status, setStatus] = useState('in_stock'); const [vendor, setVendor] = useState(''); const [q, setQ] = useState(''); const dq = useDebounced(q); const [off, setOff] = useState(0);
  const [edit, setEdit] = useState<any>(null); const [sell, setSell] = useState<any>(null); const [bulk, setBulk] = useState(false); const [vEdit, setVEdit] = useState<any>(null); const [qc, setQc] = useState<any>(null);
  const units = useLoad(() => get('/stock/units' + qs({ status, vendor, q: dq, limit: 25, offset: off })), [status, vendor, dq, off]);
  const vendors = useLoad(() => get('/stock/vendors'), []);
  const reloadAll = () => { units.reload(); vendors.reload(); };
  const s = units.data?.summary;
  const back = async (u: any) => { if (!confirm(`Mark ${u.model_number} as returned and remove the customer?`)) return; try { await post(`/stock/units/${u.id}/return`); toast.ok('Marked returned'); reloadAll(); } catch (e) { toast.err(e); } };
  const remove = async (u: any) => { if (!confirm(`Delete ${u.model_number}${u.serial_number ? ' (' + u.serial_number + ')' : ''}?`)) return; try { await del(`/stock/units/${u.id}`); toast.ok('Deleted'); reloadAll(); } catch (e) { toast.err(e); } };

  return <><PageHead title="Stock" sub="Every machine you buy and sell — model number, serial, vendor and customer in one place.">
    <a className="btn" href="/api/v1/admin/stock/units.csv" target="_blank" rel="noreferrer">Export CSV</a>
    {w && <><button className="btn" onClick={() => setBulk(true)}>Add many</button><button className="btn pri" onClick={() => setEdit({})}><Icon n="plus" /> Add machine</button></>}</PageHead>

    <div className="grid g4" style={{ marginBottom: 16 }}>
      <div className="stat"><span className="hint">In stock</span><b style={{ fontSize: 26 }}>{s?.inStock ?? '–'}</b><span className="hint">machines on shelf</span></div>
      <div className="stat"><span className="hint">Stock value</span><b style={{ fontSize: 26 }}>{s ? inr(s.stockValue) : '–'}</b><span className="hint">at purchase price</span></div>
      <div className="stat"><span className="hint">Sold</span><b style={{ fontSize: 26 }}>{s?.sold ?? '–'}</b><span className="hint">machines sold</span></div>
      <div className="stat"><span className="hint">Profit on sold</span><b style={{ fontSize: 26, color: s && s.profit < 0 ? 'var(--err)' : undefined }}>{s ? inr(s.profit) : '–'}</b><span className="hint">sold price − purchase</span></div></div>

    <div className="ptabs"><button className={view === 'units' ? 'on' : ''} onClick={() => setView('units')}>Machines</button><button className={view === 'vendors' ? 'on' : ''} onClick={() => setView('vendors')}>Vendors<i>{vendors.data?.length ?? '–'}</i></button></div>

    {view === 'units' ? <>
      <div className="ptabs" style={{ marginTop: -4 }}>{TABS.map(([k, t]) => <button key={k} className={status === k ? 'on' : ''} onClick={() => { setStatus(k); setOff(0); }}>{t}{k && s ? <i>{k === 'in_stock' ? s.inStock : k === 'sold' ? s.sold : k === 'returned' ? s.returned : s.defective}</i> : k === '' && s ? <i>{s.total}</i> : null}</button>)}</div>
      <div className="tbar"><div className="sbox"><Icon n="search" /><input placeholder="Search model no., serial, customer, phone or order…" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} /></div>
        <select value={vendor} onChange={(e) => { setVendor(e.target.value); setOff(0); }}><option value="">All vendors</option>{(vendors.data ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
      {!units.data ? <Loading error={units.error} /> : <><div className="card tw plist"><table><thead><tr><th>Model / Serial</th><th>Bought from</th><th>Purchase</th><th>Status</th><th>Sold to</th><th /></tr></thead><tbody>{units.data.rows.map((u: any) => <tr key={u.id}>
        <td><b>{u.model_number}</b><div className="hint">{u.serial_number ? 'S/N ' + u.serial_number : 'No serial'}{u.title ? ' · ' + u.title : ''}</div></td>
        <td>{u.vendor_name ?? <span className="hint">—</span>}{u.purchase_ref && <div className="hint">Inv {u.purchase_ref}</div>}</td>
        <td><b>{inr(u.purchase_price)}</b><div className="hint">{day(u.purchase_date)}</div></td>
        <td><Badge kind={KIND[u.status]}>{LABEL[u.status]}</Badge></td>
        <td>{u.status === 'sold' ? <><b>{u.customer_name}</b><div className="hint">{[u.customer_phone, u.order_number && 'Order ' + u.order_number].filter(Boolean).join(' · ')}</div><div className="hint">{u.sold_price != null && inr(u.sold_price) + ' · '}{day(u.sold_date)}{u.warranty_until && ' · warranty till ' + day(u.warranty_until)}</div></> : <span className="hint">—</span>}</td>
        <td className="acts">{w && (u.status !== 'sold' ? <button className="btn sm pri" onClick={() => setSell({ unit: u, soldDate: today(), warrantyMonths: 12 })}>Sell</button> : <button className="btn sm" onClick={() => back(u)}>Returned</button>)}{w && u.status !== 'sold' && <button className="btn sm" onClick={() => setQc(u)}>QC</button>}{w && <button className="btn sm" onClick={() => setEdit({ ...u, purchase_date: iso(u.purchase_date) })}>Edit</button>}{w && u.status !== 'sold' && <button className="btn sm dng" onClick={() => remove(u)}>✕</button>}</td></tr>)}</tbody></table>
        {!units.data.rows.length && <div className="empty-row">{s?.total ? 'No machines match.' : 'No machines yet — click “Add machine” to record your first one.'}</div>}</div>
        <Pager total={units.data.total} limit={25} offset={off} onChange={setOff} /></>}</>
    : <>{!vendors.data ? <Loading error={vendors.error} /> : <div className="card tw plist"><table><thead><tr><th>Vendor</th><th>Contact</th><th>City</th><th>Machines</th><th>Total bought</th><th /></tr></thead><tbody>{vendors.data.map((v: any) => <tr key={v.id}><td><b>{v.name}</b>{v.gstin && <div className="hint">GSTIN {v.gstin}</div>}</td><td>{v.contact_person}<div className="hint">{[v.phone, v.email].filter(Boolean).join(' · ')}</div></td><td>{v.city || '—'}</td><td>{v.units}</td><td>{inr(v.spent)}</td>
      <td className="acts">{w && <><button className="btn sm" onClick={() => setVEdit(v)}>Edit</button><button className="btn sm dng" onClick={async () => { if (!confirm('Delete vendor ' + v.name + '?')) return; try { await del('/stock/vendors/' + v.id); vendors.reload(); } catch (e) { toast.err(e); } }}>✕</button></>}</td></tr>)}</tbody></table>
      {!vendors.data.length && <div className="empty-row">No vendors yet — they appear here when you add a machine.</div>}</div>}
      <p className="hint">Vendors are added automatically when you type a vendor name while adding a machine.</p></>}

    {edit && <UnitModal u={edit} vendors={vendors.data ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reloadAll(); }} />}
    {bulk && <BulkModal vendors={vendors.data ?? []} onClose={() => setBulk(false)} onSaved={() => { setBulk(false); reloadAll(); }} />}
    {qc && <QcModal u={qc} onClose={() => setQc(null)} onSaved={() => { setQc(null); reloadAll(); }} />}
    {sell && <SellModal s={sell} onClose={() => setSell(null)} onSaved={() => { setSell(null); reloadAll(); }} />}
    {vEdit && <VendorModal v={vEdit} onClose={() => setVEdit(null)} onSaved={() => { setVEdit(null); vendors.reload(); }} />}
  </>;
}

function UnitModal({ u, vendors, onClose, onSaved }: any) {
  const toast = useToast(); const isNew = !u.id;
  const [f, setF] = useState({ modelNumber: u.model_number ?? '', serialNumber: u.serial_number ?? '', brand: u.brand ?? '', title: u.title ?? '', vendorName: u.vendor_name ?? '', purchasePrice: u.purchase_price ?? '', purchaseDate: u.purchase_date ?? today(), purchaseRef: u.purchase_ref ?? '', notes: u.notes ?? '', status: u.status ?? 'in_stock' });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const save = async () => { try { const b = { modelNumber: f.modelNumber, serialNumber: f.serialNumber || null, brand: f.brand, title: f.title, vendorName: f.vendorName.trim(), purchasePrice: Number(f.purchasePrice || 0), purchaseDate: f.purchaseDate || null, purchaseRef: f.purchaseRef, notes: f.notes, ...(isNew || u.status === 'sold' ? {} : { status: f.status }) }; if (isNew) await post('/stock/units', b); else await put('/stock/units/' + u.id, b); toast.ok(isNew ? 'Machine added' : 'Saved'); onSaved(); } catch (e) { toast.err(e); } };
  return <Modal title={isNew ? 'Add machine' : 'Edit machine'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!f.modelNumber.trim()} onClick={save}>{isNew ? 'Add machine' : 'Save'}</button></>}>
    <div className="grid g2"><Field label="Model number *"><input autoFocus value={f.modelNumber} onChange={(e) => set('modelNumber', e.target.value)} placeholder="e.g. HP ProBook 430 G5" /></Field><Field label="Serial number" hint="Must be unique"><input value={f.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} placeholder="e.g. 5CD8123ABC" /></Field>
      <Field label="Brand"><input value={f.brand} onChange={(e) => set('brand', e.target.value)} /></Field><Field label="Description"><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="i5 8th gen · 8GB · 256GB SSD" /></Field>
      <Field label="Bought from (vendor)" hint="Type the vendor name — it is remembered for next time"><><input list="vendor-names" value={f.vendorName} onChange={(e) => set('vendorName', e.target.value)} placeholder="e.g. Nehru Place Traders" /><datalist id="vendor-names">{vendors.map((v: any) => <option key={v.id} value={v.name} />)}</datalist></></Field>
      <Field label="Purchase price"><div className="ig"><em>₹</em><input type="number" value={f.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} /></div></Field><Field label="Purchase date"><input type="date" value={f.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} /></Field>
      <Field label="Vendor invoice no."><input value={f.purchaseRef} onChange={(e) => set('purchaseRef', e.target.value)} /></Field>
      {!isNew && u.status !== 'sold' && <Field label="Status"><select value={f.status} onChange={(e) => set('status', e.target.value)}><option value="in_stock">In stock</option><option value="returned">Returned</option><option value="defective">Defective</option></select></Field>}</div>
    <Field label="Notes"><textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Scratches, battery health, charger included…" /></Field></Modal>;
}

function BulkModal({ vendors, onClose, onSaved }: any) {
  const toast = useToast(); const [vendorName, setVendorName] = useState(''); const [price, setPrice] = useState(''); const [date, setDate] = useState(today()); const [ref, setRef] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const run = async () => { setBusy(true); let ok = 0; const bad: string[] = []; for (const l of lines) { const [model, serial] = l.split(/[,\t]/).map((x) => x.trim()); try { await post('/stock/units', { modelNumber: model, serialNumber: serial || null, vendorName: vendorName.trim(), purchasePrice: Number(price || 0), purchaseDate: date || null, purchaseRef: ref }); ok++; } catch (e: any) { bad.push(`${serial || model}: ${e.message}`); } } setBusy(false); if (bad.length) toast.err(new Error(`${ok} added, ${bad.length} failed — ${bad.slice(0, 2).join('; ')}`)); else toast.ok(`${ok} machines added`); onSaved(); };
  return <Modal title="Add many machines" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={!lines.length || busy} onClick={run}>{busy ? 'Adding…' : `Add ${lines.length} machine${lines.length === 1 ? '' : 's'}`}</button></>}>
    <p className="hint">Same vendor, price and date for all. Then one machine per line as <b>model number, serial number</b>. You can paste straight from Excel.</p>
    <div className="grid g2"><Field label="Vendor"><><input list="vendor-names2" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name" /><datalist id="vendor-names2">{vendors.map((v: any) => <option key={v.id} value={v.name} />)}</datalist></></Field><Field label="Price per machine"><div className="ig"><em>₹</em><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div></Field><Field label="Purchase date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Vendor invoice no."><input value={ref} onChange={(e) => setRef(e.target.value)} /></Field></div>
    <Field label="Machines"><textarea style={{ minHeight: 160, fontFamily: 'ui-monospace,monospace' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={'HP ProBook 430 G5, 5CD8123ABC\nDell Latitude 5490, 7XK2M93\nLenovo T480, PF1ABCDE'} /></Field></Modal>;
}

function SellModal({ s, onClose, onSaved }: any) {
  const toast = useToast(); const u = s.unit; const [f, setF] = useState({ orderNumber: '', customerName: '', customerPhone: '', customerEmail: '', soldPrice: '', soldDate: s.soldDate, warrantyMonths: s.warrantyMonths });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const save = async () => { try { await post(`/stock/units/${u.id}/sell`, { orderNumber: f.orderNumber || undefined, customerName: f.customerName || undefined, customerPhone: f.customerPhone || undefined, customerEmail: f.customerEmail || undefined, soldPrice: f.soldPrice === '' ? null : Number(f.soldPrice), soldDate: f.soldDate || undefined, warrantyMonths: Number(f.warrantyMonths) || 0 }); toast.ok('Marked as sold'); onSaved(); } catch (e) { toast.err(e); } };
  return <Modal title={`Sell — ${u.model_number}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={save}>Mark as sold</button></>}>
    <p className="hint">{u.serial_number ? 'S/N ' + u.serial_number + ' · ' : ''}bought for {inr(u.purchase_price)}{u.vendor_name ? ' from ' + u.vendor_name : ''}</p>
    <Field label="Website order number" hint="If this machine went out on a store order, enter it — customer details fill in automatically"><input value={f.orderNumber} onChange={(e) => set('orderNumber', e.target.value)} placeholder="e.g. RT-30955" /></Field>
    <div className="grid g2"><Field label="Customer name"><input value={f.customerName} onChange={(e) => set('customerName', e.target.value)} /></Field><Field label="Phone"><input value={f.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} /></Field><Field label="Email"><input value={f.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} /></Field>
      <Field label="Sold price"><div className="ig"><em>₹</em><input type="number" value={f.soldPrice} onChange={(e) => set('soldPrice', e.target.value)} /></div></Field><Field label="Sold on"><input type="date" value={f.soldDate} onChange={(e) => set('soldDate', e.target.value)} /></Field><Field label="Warranty"><div className="ig"><input type="number" value={f.warrantyMonths} onChange={(e) => set('warrantyMonths', e.target.value)} /><em>months</em></div></Field></div></Modal>;
}

function VendorModal({ v, onClose, onSaved }: any) {
  const toast = useToast(); const [f, setF] = useState({ name: v.name ?? '', contactPerson: v.contact_person ?? '', phone: v.phone ?? '', email: v.email ?? '', city: v.city ?? '', gstin: v.gstin ?? '', notes: v.notes ?? '' }); const set = (k: string, x: any) => setF({ ...f, [k]: x });
  const save = async () => { try { if (v.id) await put('/stock/vendors/' + v.id, f); else await post('/stock/vendors', f); toast.ok('Vendor saved'); onSaved(); } catch (e) { toast.err(e); } };
  return <Modal title={v.id ? 'Edit vendor' : 'Add vendor'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" disabled={f.name.trim().length < 2} onClick={save}>Save vendor</button></>}>
    <div className="grid g2"><Field label="Vendor name *"><input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} /></Field><Field label="Contact person"><input value={f.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} /></Field><Field label="Phone"><input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field><Field label="Email"><input value={f.email} onChange={(e) => set('email', e.target.value)} /></Field><Field label="City"><input value={f.city} onChange={(e) => set('city', e.target.value)} /></Field><Field label="GSTIN"><input value={f.gstin} onChange={(e) => set('gstin', e.target.value)} maxLength={15} /></Field></div>
    <Field label="Notes"><textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field></Modal>;
}

function QcModal({ u, onClose, onSaved }: { u: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const d = useLoad(() => get(`/stock/units/${u.id}/qc`), [u.id]); const [checks, setChecks] = useState<Record<string, boolean> | null>(null); const [f, setF] = useState<any>({});
  if (!d.data) return <Modal title="QC" onClose={onClose}><Loading error={d.error} /></Modal>;
  const c = checks ?? d.data.qc.checks ?? {}; const v = { battery: d.data.battery_health ?? '', repair: Number(d.data.repair_cost || 0), grade: d.data.unit_grade || '', notes: '', ...f };
  const done = d.data.items.filter((k: string) => c[k]).length;
  const save = async (result: string) => { try { await put(`/stock/units/${u.id}/qc`, { checks: c, batteryHealth: v.battery === '' ? null : Number(v.battery), repairCost: Number(v.repair) || 0, grade: v.grade, notes: v.notes, result }); toast.ok(result === 'pass' ? 'QC passed. Machine is back in stock' : 'Saved'); onSaved(); } catch (e) { toast.err(e); } };
  return <Modal title={`QC — ${u.model_number}${u.serial_number ? ' · ' + u.serial_number : ''}`} size="lg" onClose={onClose} footer={<><button className="btn" onClick={() => save('save')}>Save progress</button><button className="btn" onClick={() => save('repair')}>Send to repair</button><button className="btn dng" onClick={() => save('fail')}>Fail (defective)</button><button className="btn pri" onClick={() => save('pass')}>Pass &amp; put in stock</button></>}>
    <div className="prog" style={{ marginBottom: 6 }}><i style={{ width: (done / d.data.items.length) * 100 + '%' }} /></div><div className="hint" style={{ margin: '0 0 12px' }}>{done}/{d.data.items.length} checks done. All must be ticked to pass.</div>
    <div className="grid g2">{d.data.items.map((k: string) => <label key={k} className="row" style={{ gap: 8, padding: '6px 0' }}><input type="checkbox" checked={!!c[k]} onChange={(e) => setChecks({ ...c, [k]: e.target.checked })} />{k}</label>)}</div>
    <div className="grid g2" style={{ marginTop: 10 }}>
      <Field label="Battery health %"><input type="number" min={0} max={100} value={v.battery} onChange={(e) => setF({ ...f, battery: e.target.value })} /></Field>
      <Field label="Repair cost (₹)"><input type="number" min={0} value={v.repair} onChange={(e) => setF({ ...f, repair: e.target.value })} /></Field>
      <Field label="Grade"><select value={v.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}><option value="">—</option><option>A+</option><option>A</option><option>B</option></select></Field>
      <Field label="Note"><input value={v.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field></div>
  </Modal>;
}

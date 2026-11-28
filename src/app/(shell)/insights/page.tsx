'use client';
import { useState } from 'react';
import { get } from '@/lib/api';
import { PageHead, useLoad, Loading, Empty } from '@/components/ui';
import { Kpi } from '@/components/seo/Health';

const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const inr = (n: any) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const nf = (n: any) => Number(n || 0).toLocaleString('en-IN');
const short = (n: number) => (n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(2) + ' L' : inr(n));
const mlabel = (m: string) => MN[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const chg = (a: number, b: number) => (b > 0 ? (a - b) / b : null);
const pct = (x: number | null) => (x == null ? '—' : (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(1) + '%');
const col = (x: number | null) => (x == null ? undefined : x >= 0 ? '#1c9a4f' : '#d6453a');
const ist = () => new Date(Date.now() + 330 * 60000).toISOString();
const csv = (name: string, head: string[], rows: any[][]) => {
  const esc = (v: any) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const b = new Blob([[head, ...rows].map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); URL.revokeObjectURL(a.href);
};
const PERIODS: [string, string][] = [['month', 'This month'], ['30', '30 days'], ['90', '90 days'], ['year', 'This year'], ['all', 'All time']];
const sinceOf = (p: string) => { const n = ist(); if (p === 'all') return '2000-01-01'; if (p === 'month') return n.slice(0, 7) + '-01'; if (p === 'year') return n.slice(0, 4) + '-01-01'; return new Date(Date.now() + 330 * 60000 - (+p) * 86400000).toISOString().slice(0, 10); };

export default function Insights() {
  const [period, setPeriod] = useState('30'); const since = sinceOf(period);
  const r = useLoad(() => get('/reports/insights?since=' + since), [since]);
  const x = r.data;
  const now = ist(); const curM = now.slice(0, 7); const cutDay = +now.slice(8, 10);
  let pm = +curM.slice(5, 7) - 1, py = +curM.slice(0, 4); if (pm < 1) { pm = 12; py--; } const prevM = py + '-' + String(pm).padStart(2, '0');

  const body = () => {
    const monthly: any[] = (x.monthly ?? []).map((m: any, i: number, a: any[]) => ({ ...m, aov: m.sales ? m.revenue / m.sales : 0, change: i ? chg(m.revenue, a[i - 1].revenue) : null }));
    const sum = (mon: string) => (x.daily ?? []).filter((d: any) => d.date.slice(0, 7) === mon && +d.date.slice(8, 10) <= cutDay).reduce((a: any, d: any) => ({ placed: a.placed + d.placed, sales: a.sales + d.sales, revenue: a.revenue + d.revenue }), { placed: 0, sales: 0, revenue: 0 });
    const c = sum(curM), p = sum(prevM); const cAov = c.sales ? c.revenue / c.sales : 0, pAov = p.sales ? p.revenue / p.sales : 0; const cConv = c.placed ? c.sales / c.placed : 0, pConv = p.placed ? p.sales / p.placed : 0;
    const by: Record<number, any> = {}; monthly.forEach((m) => { const y = +m.month.slice(0, 4); const o = (by[y] = by[y] || { year: y, placed: 0, sales: 0, revenue: 0 }); o.placed += m.placed; o.sales += m.sales; o.revenue += m.revenue; });
    const ys = Object.keys(by).map(Number); const y0 = ys.length ? Math.min(...ys) : +curM.slice(0, 4); const y1 = Math.max(2028, +curM.slice(0, 4), ...ys); const years: any[] = [];
    for (let y = y0; y <= y1; y++) { const o = by[y] || { year: y, placed: 0, sales: 0, revenue: 0 }; years.push({ ...o, aov: o.sales ? o.revenue / o.sales : 0 }); }
    years.forEach((o, i) => { o.change = i && years[i - 1].revenue > 0 && o.revenue > 0 ? chg(o.revenue, years[i - 1].revenue) : null; });
    const tot = monthly.reduce((a, m) => ({ placed: a.placed + m.placed, sales: a.sales + m.sales, revenue: a.revenue + m.revenue, cancelled: a.cancelled + m.cancelled }), { placed: 0, sales: 0, revenue: 0, cancelled: 0 });
    const maxRev = Math.max(1, ...monthly.map((m) => m.revenue)); const payTot = (x.payment ?? []).reduce((a: number, d: any) => a + d.revenue, 0) || 1;
    const models: any[] = x.models ?? []; const brands: Record<string, any> = {}; models.forEach((m) => { const b = (brands[m.brand] = brands[m.brand] || { brand: m.brand, units: 0, orders: 0, revenue: 0 }); b.units += m.units; b.orders += m.orders; b.revenue += m.revenue; });
    const brandRows = Object.values(brands).filter((b: any) => b.units > 0).sort((a: any, b: any) => b.revenue - a.revenue);
    const modelRows = models.filter((m) => m.units > 0);
    return <>
      <p className="hint" style={{ margin: '0 0 10px' }}>A sale is an order paid online, or a COD order that is shipped or delivered. Cancelled and returned orders are not counted. Amounts include GST and delivery. Dates are IST.</p>
      <h2 style={{ margin: '8px 0' }}>{mlabel(curM)} so far vs {mlabel(prevM)} <small className="hint" style={{ display: 'inline' }}>(same days 1–{cutDay} of both months)</small></h2>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
        <Kpi l="Revenue" v={short(c.revenue)} c={col(chg(c.revenue, p.revenue))} sub={`${pct(chg(c.revenue, p.revenue))} vs ${short(p.revenue)}`} />
        <Kpi l="Paid sales" v={nf(c.sales)} sub={`${pct(chg(c.sales, p.sales))} vs ${nf(p.sales)}`} />
        <Kpi l="Average order" v={inr(cAov)} sub={`${pct(chg(cAov, pAov))} vs ${inr(pAov)}`} />
        <Kpi l="Orders placed (incl. unpaid)" v={nf(c.placed)} sub={`${pct(chg(c.placed, p.placed))} vs ${nf(p.placed)}`} />
        <Kpi l="Placed → paid" v={(cConv * 100).toFixed(1) + '%'} c={cConv < pConv ? '#d6453a' : '#1c9a4f'} sub={`${((cConv - pConv) * 100 >= 0 ? '+' : '−') + Math.abs((cConv - pConv) * 100).toFixed(1)} pts vs ${(pConv * 100).toFixed(1)}%`} />
      </div>

      <div className="row sp" style={{ margin: '18px 0 8px' }}><h2 style={{ margin: 0 }}>Every month</h2><button className="btn sm" onClick={() => csv('monthly-sales.csv', ['Month', 'Orders placed', 'Paid sales', 'Revenue', 'Average order', 'Cancelled', 'Returned', 'Revenue vs last month %'], monthly.map((m) => [m.month, m.placed, m.sales, Math.round(m.revenue), Math.round(m.aov), m.cancelled, m.returned, m.change == null ? '' : (m.change * 100).toFixed(1)]))}>Download CSV</button></div>
      {!monthly.length ? <Empty title="No orders yet" /> : <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>{monthly.map((m) => <div key={m.month} title={`${mlabel(m.month)} · ${inr(m.revenue)} · ${m.sales} sales`} style={{ flex: 1, minWidth: 6, height: Math.max(2, (m.revenue / maxRev) * 100) + '%', background: 'var(--pri, #1c9a4f)', opacity: m.month === curM ? 0.5 : 1, borderRadius: 3 }} />)}</div>
        <div className="hint" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><span>{mlabel(monthly[0].month)}</span><span>{mlabel(monthly[monthly.length - 1].month)} (faded = month still running)</span></div></div>}
      <div className="card tw" style={{ marginTop: 10 }}><table><thead><tr><th>Month</th><th>Orders placed</th><th>Paid sales</th><th>Revenue</th><th>Avg order</th><th>vs last month</th></tr></thead><tbody>{[...monthly].reverse().map((m) => <tr key={m.month}><td><b>{mlabel(m.month)}</b>{m.month === curM && <span className="hint"> (so far)</span>}</td><td>{nf(m.placed)}</td><td>{nf(m.sales)}</td><td>{inr(m.revenue)}</td><td>{inr(m.aov)}</td><td style={{ color: col(m.change) }}>{pct(m.change)}</td></tr>)}</tbody></table></div>

      <div className="row sp" style={{ margin: '22px 0 8px' }}><h2 style={{ margin: 0 }}>Yearly report</h2><button className="btn sm" onClick={() => csv('yearly-sales.csv', ['Year', 'Orders placed', 'Paid sales', 'Revenue', 'Average order', 'Revenue vs last year %'], years.map((o) => [o.year, o.placed, o.sales, Math.round(o.revenue), Math.round(o.aov), o.change == null ? '' : (o.change * 100).toFixed(1)]))}>Download CSV</button></div>
      <div className="card tw"><table><thead><tr><th>Year</th><th>Orders placed</th><th>Paid sales</th><th>Revenue</th><th>Avg order</th><th>vs last year</th></tr></thead><tbody>{years.map((o) => <tr key={o.year}><td><b>{o.year}</b></td>{o.placed ? <><td>{nf(o.placed)}</td><td>{nf(o.sales)}</td><td>{inr(o.revenue)}</td><td>{inr(o.aov)}</td><td style={{ color: col(o.change) }}>{pct(o.change)}</td></> : <td colSpan={5} className="hint">—</td>}</tr>)}</tbody></table></div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', marginTop: 10 }}>
        <Kpi l="All orders placed to date" v={nf(tot.placed)} sub={`${nf(tot.sales)} paid sales · ${nf(tot.cancelled)} cancelled`} />
        <Kpi l="Total revenue to date" v={short(tot.revenue)} sub={inr(tot.revenue)} />
        <Kpi l="Average order to date" v={inr(tot.sales ? tot.revenue / tot.sales : 0)} />
      </div>

      <h2 style={{ margin: '22px 0 8px' }}>How customers paid <small className="hint" style={{ display: 'inline' }}>(all time)</small></h2>
      <div className="card" style={{ padding: 14 }}>{(x.payment ?? []).map((d: any) => <div key={d.method} style={{ marginBottom: 10 }}><div className="row sp"><b style={{ textTransform: 'uppercase' }}>{d.method}</b><span>{inr(d.revenue)} · {nf(d.sales)} sales · {((d.revenue / payTot) * 100).toFixed(0)}%</span></div><div style={{ height: 8, background: 'var(--line, #2a3a33)', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}><div style={{ width: (d.revenue / payTot) * 100 + '%', height: '100%', background: 'var(--pri, #1c9a4f)' }} /></div></div>)}</div>

      <div className="row sp" style={{ margin: '22px 0 8px' }}><h2 style={{ margin: 0 }}>Model-wise sales <small className="hint" style={{ display: 'inline' }}>({PERIODS.find((q) => q[0] === period)?.[1].toLowerCase()})</small></h2>
        <div className="row">{PERIODS.map(([k, t]) => <button key={k} className={'btn sm ' + (period === k ? 'pri' : '')} onClick={() => setPeriod(k)}>{t}</button>)}<button className="btn sm" onClick={() => csv('model-wise-sales.csv', ['Brand', 'Model', 'Units', 'Orders', 'Revenue', 'Units this month', 'Units last month'], modelRows.map((m) => [m.brand, m.model, m.units, m.orders, Math.round(m.revenue), m.curUnits, m.prevUnits]))}>Download CSV</button></div></div>
      {x.modelsError ? <Empty title="Model-wise data could not load" /> : !modelRows.length ? <Empty title="No sales in this period" /> : <>
        <div className="card tw"><table><thead><tr><th>Brand</th><th>Units</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>{brandRows.map((b: any) => <tr key={b.brand}><td><b>{b.brand}</b></td><td>{nf(b.units)}</td><td>{nf(b.orders)}</td><td>{inr(b.revenue)}</td></tr>)}</tbody></table></div>
        <div className="card tw" style={{ marginTop: 10 }}><table><thead><tr><th>Model</th><th>Brand</th><th>Units</th><th>Orders</th><th>Revenue</th><th>{MN[+curM.slice(5, 7) - 1]} so far</th><th>{MN[pm - 1]}</th></tr></thead><tbody>{modelRows.map((m, i) => <tr key={m.brand + m.model + i}><td><b>{m.model}</b></td><td>{m.brand}</td><td>{nf(m.units)}</td><td>{nf(m.orders)}</td><td>{inr(m.revenue)}</td><td>{nf(m.curUnits)}</td><td>{nf(m.prevUnits)}</td></tr>)}</tbody></table></div>
        <p className="hint" style={{ marginTop: 6 }}>Models are grouped by the brand and model set on each product, so variants of one model (RAM, SSD) are counted together. The last two columns are the current and previous calendar month, whatever period is picked above.</p></>}
    </>;
  };
  return <><PageHead title="Sales insights" sub="Month-on-month, yearly, and model-wise sales from your real orders." />{!x ? <Loading error={r.error} /> : body()}</>;
}

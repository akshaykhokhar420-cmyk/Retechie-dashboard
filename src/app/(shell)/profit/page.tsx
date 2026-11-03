'use client';
import { useState } from 'react';
import { get } from '@/lib/api';
import { PageHead, Alert, useLoad, Loading, Empty } from '@/components/ui';
import { Kpi } from '@/components/seo/Health';

const inr = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN');
export default function Profit() {
  const [days, setDays] = useState(30); const r = useLoad(() => get('/reports/profit?days=' + days), [days]);
  const x = r.data; const cn = useLoad(() => get('/credit-notes'), []);
  return <><PageHead title="Profit & stock ageing" sub="Real margin per order from the machines you actually sold, plus how long stock has been sitting.">
    <div className="row">{[7, 30, 90, 365].map((d) => <button key={d} className={'btn sm ' + (days === d ? 'pri' : '')} onClick={() => setDays(d)}>{d === 365 ? '1 year' : d + ' days'}</button>)}</div></PageHead>
    {!x ? <Loading error={r.error} /> : <>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
        <Kpi l="Net sales (ex GST, ex shipping)" v={inr(x.netSales)} sub={`${x.orders} paid orders`} />
        <Kpi l="Purchase cost" v={inr(x.cost)} sub={`${x.costKnownOrders} orders with machines linked`} />
        <Kpi l="Gross margin" v={inr(x.grossMargin)} c={x.grossMargin >= 0 ? '#1c9a4f' : '#d6453a'} sub="on orders with known cost" />
        <Kpi l="Margin %" v={x.marginPct === null ? '—' : x.marginPct + '%'} />
        <Kpi l="Return rate" v={x.returnRate + '%'} c={x.returnRate > 8 ? '#d6453a' : undefined} />
      </div>
      {x.costUnknownOrders > 0 && <Alert kind="warn">{x.costUnknownOrders} order(s) have no machine linked, so their margin is unknown (not guessed). In <b>Stock</b>, mark the machine as sold against that order number to see the margin.</Alert>}
      <div className="row2">
        <div className="wd l"><h3>Stock ageing</h3><p className="hint">Machines in stock or returned, by days since purchase.</p>{x.aging.map((a: any) => <div key={a.bucket} className="row sp" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span>{a.bucket} days</span><span><b>{a.units}</b> machines · {inr(a.value)}</span></div>)}</div>
        <div className="wd l"><h3>How margin is worked out</h3><p className="hint">Net sales = order total − GST − shipping. Cost = purchase price of the machines linked to the order. If any machine is not linked, the order is shown as "unknown" instead of guessing.</p></div>
      </div>
      <h2 style={{ margin: '16px 0 8px' }}>Orders</h2>
      {!x.rows.length ? <Empty title="No paid orders in this period" /> : <div className="card tw"><table><thead><tr><th>Order</th><th>Date</th><th>Net sales</th><th>Cost</th><th>Margin</th><th>%</th></tr></thead><tbody>{x.rows.map((o: any) => <tr key={o.id}><td><b>{o.orderNumber}</b></td><td>{new Date(o.date).toLocaleDateString('en-IN')}</td><td>{inr(o.netSales)}</td><td>{o.cost === null ? <span className="hint" style={{ margin: 0 }}>unknown</span> : inr(o.cost)}</td><td style={{ color: o.margin === null ? undefined : o.margin >= 0 ? '#1c9a4f' : '#d6453a' }}>{o.margin === null ? '—' : inr(o.margin)}</td><td>{o.marginPct === null ? '—' : o.marginPct + '%'}</td></tr>)}</tbody></table></div>}
      <h2 style={{ margin: '18px 0 8px' }}>Credit notes <small className="hint" style={{ display: 'inline' }}>(created automatically on refunds; drafts until your CA confirms the GST treatment)</small></h2>
      {!cn.data ? <Loading error={cn.error} /> : !cn.data.length ? <Empty title="No credit notes yet" /> : <div className="card tw"><table><thead><tr><th>Number</th><th>Order</th><th>Amount</th><th>Reason</th><th>Date</th></tr></thead><tbody>{cn.data.map((c: any) => <tr key={c.id}><td><b>{c.number}</b></td><td>{c.order_number}</td><td>{inr(c.amount)}</td><td>{c.reason}</td><td>{new Date(c.created_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div>}
    </>}</>;
}

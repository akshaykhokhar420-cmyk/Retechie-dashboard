'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ConfirmHost } from '@/components/Confirm';
import { openPreview, get } from '@/lib/api';
import { useToast } from '@/lib/toast';
import Icon from '@/components/Icon';

type Item = [href: string, label: string, perms: string[], icon: string];
const SEO_SUB: [string, string][] = [['dash', 'Overview'], ['analytics', 'Analytics'], ['gsc', 'Search Console'], ['audit', 'Technical audit'], ['live', 'Live technical check'], ['crawl', 'Crawl & indexability'], ['keywords', 'Keywords'], ['focus', 'Focus keywords'], ['social', 'Social previews'], ['unused', 'Unused media'], ['redir', 'Redirects'], ['broken', '404 & broken links'], ['sitemap', 'Sitemaps'], ['robots', 'Robots & crawling'], ['schema', 'Schema validation'], ['ai', 'AI search readiness'], ['reports', 'Reports'], ['integrations', 'Integrations'], ['logs', 'Activity logs'], ['settings', 'Settings']];
const NAV: { g: string; items: Item[] }[] = [
  { g: 'Overview', items: [['/', 'Dashboard', [], 'home']] },
  { g: 'Sales', items: [['/orders', 'Orders', ['orders.read'], 'cart'], ['/aftersales', 'Returns & warranty', ['orders.read'], 'life'], ['/invoices', 'Invoices', ['orders.read'], 'file'], ['/stock', 'Stock', ['products.read'], 'list'], ['/profit', 'Profit & ageing', ['orders.read', 'products.read'], 'rupee'], ['/tracking', 'Courier tracking', ['settings.read', 'settings.write'], 'zap'], ['/customers', 'Customers', ['customers.read'], 'users'], ['/support', 'Support & newsletter', ['customers.read'], 'life']] },
  { g: 'Catalogue', items: [['/products', 'Products', ['products.read'], 'box'], ['/categories', 'Categories', ['categories.read', 'products.read'], 'folder'], ['/collections', 'Collections', ['content.read'], 'tag'], ['/reviews', 'Reviews', ['products.read'], 'star'], ['/promotions', 'Promotions', ['promotions.write'], 'gift']] },
  { g: 'Site content', items: [['/pages', 'Pages & sections', ['pages.read', 'content.read'], 'layout'], ['/content', 'Text & labels', ['content.read'], 'text'], ['/navigation', 'Menus & footer', ['navigation.write', 'content.read'], 'menu'], ['/whatsapp', 'WhatsApp chat', ['settings.read', 'settings.write'], 'chat'], ['/faqs', 'FAQs', ['content.read'], 'list'], ['/policies', 'Policies', ['content.read'], 'file'], ['/media', 'Media library', ['media.read'], 'img']] },
  { g: 'Growth', items: [['/seo-analysis', 'SEO Analysis', ['seo.read', 'seo.write'], 'search'], ['/cookies', 'Cookies & privacy', ['cookies.read', 'cookies.write'], 'shield']] },
  { g: 'System', items: [['/knowledge', 'Knowledge Center', ['settings.read', 'settings.write'], 'chat'], ['/developer', 'Developer', ['developer.view'], 'code'], ['/emails', 'Emails', ['settings.read', 'settings.write'], 'mail'], ['/settings', 'Settings', ['settings.read', 'settings.write'], 'cog'], ['/payments', 'Online payments', ['settings.read', 'settings.write'], 'card'], ['/users', 'Users & roles', ['users.manage'], 'key'], ['/audit', 'Audit log', ['audit.read'], 'list'], ['/account', 'My account', [], 'user']] },
];
const STORE = (process.env.NEXT_PUBLIC_STORE_URL || 'https://retechie.com').replace(/\/$/, '');

type Cmd = { id: string; label: string; hint?: string; icon: string; run: () => void };

function Bell() {
  const [d, setD] = useState<any>(null); const [open, setOpen] = useState(false);
  useEffect(() => { let on = true; const f = () => get('/notifications').then((r: any) => on && setD(r)).catch(() => {}); f(); const t = setInterval(f, 120_000); return () => { on = false; clearInterval(t); }; }, []);
  const col: Record<string, string> = { critical: '#d6453a', warning: '#d98b0b', info: '#4a7fd4' };
  return <div style={{ position: 'relative' }}><button className="ibtn" onClick={() => setOpen(!open)} aria-label="Notifications" title="Notifications"><Icon n="alert" />{d?.total > 0 && <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: d.critical ? '#d6453a' : '#e8501f', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 4px' }}>{d.total}</span>}</button>
    {open && <><div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} /><div style={{ position: 'absolute', right: 0, top: 44, width: 360, maxHeight: 460, overflow: 'auto', background: 'var(--card, #fff)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: '0 18px 50px rgba(0,0,0,.18)', zIndex: 41, padding: 8 }}>
      <div style={{ padding: '8px 10px', fontWeight: 700 }}>Notifications</div>
      {!d ? <div className="hint" style={{ padding: 10 }}>Loading…</div> : !d.items.length ? <div className="hint" style={{ padding: 10 }}>Nothing needs your attention.</div> : d.items.map((n: any) => <Link key={n.id} href={n.href} onClick={() => setOpen(false)} style={{ display: 'block', padding: '10px', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><i style={{ width: 8, height: 8, borderRadius: 8, background: col[n.severity], flex: 'none' }} /><b style={{ fontSize: 13.5 }}>{n.title}</b><span style={{ marginLeft: 'auto', fontWeight: 700 }}>{n.count}</span></div>
        <div className="hint" style={{ margin: '2px 0 0 16px' }}>{n.detail}</div><div style={{ margin: '3px 0 0 16px', fontSize: 12.5, color: '#e8501f', fontWeight: 600 }}>{n.action} →</div></Link>)}</div></>}</div>;
}
function Palette({ cmds, onClose, onNav }: { cmds: Cmd[]; onClose: () => void; onNav: (h: string) => void }) {
  const [q, setQ] = useState(''); const [i, setI] = useState(0); const ref = useRef<HTMLInputElement>(null); const [found, setFound] = useState<Cmd[]>([]);
  useEffect(() => { const s = q.trim(); if (s.length < 2) { setFound([]); return; } const t = setTimeout(() => { get('/search?q=' + encodeURIComponent(s)).then((r: any) => setFound((r.groups || []).flatMap((g: any) => g.items.map((x: any) => ({ id: g.type + x.id, label: x.title, hint: g.label + ' · ' + x.sub, icon: 'search', run: () => onNav(x.href) }))))).catch(() => setFound([])); }, 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return [...(s ? cmds.filter((c) => (c.label + ' ' + (c.hint || '')).toLowerCase().includes(s)) : cmds), ...found]; }, [q, cmds, found]);
  useEffect(() => ref.current?.focus(), []); useEffect(() => setI(0), [q]);
  const go = (c?: Cmd) => { if (c) { onClose(); c.run(); } };
  return <div className="cmd" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div role="dialog" aria-label="Quick search">
    <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders, products, serials, invoices, customers… or jump to a page" aria-label="Search"
      onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(list.length - 1, x + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); } else if (e.key === 'Enter') go(list[i]); else if (e.key === 'Escape') onClose(); }} />
    <ul>{list.map((c, k) => <li key={c.id} className={k === i ? 'on' : ''} onMouseEnter={() => setI(k)} onClick={() => go(c)}><Icon n={c.icon} />{c.label}{c.hint && <small>{c.hint}</small>}</li>)}{!list.length && <li style={{ cursor: 'default' }}>No matches</li>}</ul>
    <div className="ft"><span>↑↓ to move</span><span>Enter to open</span><span>Esc to close</span></div></div></div>;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { me, loading, can, logout } = useAuth(); const path = usePathname(); const router = useRouter(); const toast = useToast(); const [maint, setMaint] = useState(false);
  useEffect(() => { if (!can('developer.view')) return; let on = true; const f = () => get('/developer/maintenance').then((r: any) => on && setMaint(!!r.on)).catch(() => {}); f(); const t = setInterval(f, 120_000); return () => { on = false; clearInterval(t); }; }, [me]); // eslint-disable-line
  const [mini, setMini] = useState(false); const [open, setOpen] = useState(false); const [dark, setDark] = useState(false); const [pal, setPal] = useState(false);
  useEffect(() => { if (!loading && !me) router.replace('/login'); }, [loading, me, router]);
  const [hash, setHash] = useState('dash'); useEffect(() => { const h = () => setHash(location.hash.slice(1) || 'dash'); h(); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, [path]);
  useEffect(() => {
    try { setMini(localStorage.getItem('rt-mini') === '1'); const t = localStorage.getItem('rt-theme'); const d = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; setDark(d); document.documentElement.dataset.theme = d ? 'dark' : 'light'; } catch { /* storage blocked */ }
  }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal((v) => !v); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  const toggleTheme = () => { const d = !dark; setDark(d); document.documentElement.dataset.theme = d ? 'dark' : 'light'; try { localStorage.setItem('rt-theme', d ? 'dark' : 'light'); } catch { /* ignore */ } };
  const toggleMini = () => { const m = !mini; setMini(m); try { localStorage.setItem('rt-mini', m ? '1' : '0'); } catch { /* ignore */ } };

  const groups = useMemo(() => NAV.map((g) => ({ ...g, items: g.items.filter(([, , p]) => can(...p)) })).filter((g) => g.items.length), [can, me]); // eslint-disable-line
  const cmds: Cmd[] = useMemo(() => [
    ...groups.flatMap((g) => g.items.map(([h, l, , ic]) => ({ id: h, label: l, hint: g.g, icon: ic, run: () => router.push(h) }))),
    ...(can('products.write') ? [{ id: 'new-product', label: 'Add a new product', hint: 'Action', icon: 'plus', run: () => router.push('/products/new') }] : []),
    { id: 'view-site', label: 'Open the live website', hint: 'Action', icon: 'globe', run: () => window.open(STORE, '_blank') },
    { id: 'preview', label: 'Preview draft site', hint: 'Action', icon: 'ext', run: () => openPreview('/').catch(toast.err) },
    { id: 'theme', label: dark ? 'Switch to light mode' : 'Switch to dark mode', hint: 'Action', icon: dark ? 'sun' : 'moon', run: toggleTheme },
    { id: 'logout', label: 'Sign out', hint: 'Action', icon: 'out', run: () => { logout(); } },
  ], [groups, dark]); // eslint-disable-line

  if (loading || !me) return <div style={{ padding: 40, display: 'grid', gap: 12, maxWidth: 480 }} aria-busy="true"><div className="sk" style={{ height: 28, width: 200 }} /><div className="sk" style={{ height: 120 }} /></div>;
  const initials = me.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <div className={'app' + (mini ? ' mini' : '') + (open ? ' open' : '')}>
    <nav className="side" aria-label="Main">
      <div className="brand"><i>R</i><span>Retechie<small>Admin</small></span></div>
      {groups.map((g) => <div key={g.g}><div className="grp">{g.g}</div>{g.items.map(([h, l, , ic]) => <Link key={h} href={h} title={l} className={'nv' + ((h === '/' ? path === '/' : path.startsWith(h)) ? ' on' : '')}><Icon n={ic} /><span>{l}</span></Link>).reduce((acc: any[], el: any, i: number) => { acc.push(el); if (g.items[i][0] === '/seo-analysis' && path.startsWith('/seo-analysis')) acc.push(<div key="seosub" className="subnav">{SEO_SUB.map(([k, n]) => <a key={k} href={'/seo-analysis#' + k} className={'sn' + (hash === k ? ' on' : '')} onClick={(e) => { e.preventDefault(); history.pushState(null, '', '/seo-analysis#' + k); window.dispatchEvent(new HashChangeEvent('hashchange')); }}>{n}</a>)}</div>); return acc; }, [])}</div>)}
      <div className="me"><span className="av">{initials}</span><div><b>{me.name}</b><small>{me.roles.join(', ').replace(/_/g, ' ')}</small></div><button onClick={() => logout()} aria-label="Sign out" title="Sign out"><Icon n="out" width={18} height={18} /></button></div>
    </nav>
    {open && <div className="scrim" onClick={() => setOpen(false)} />}
    <div className="wrapr">
      <header className="bar">
        <button className="ibtn burger" onClick={() => setOpen(true)} aria-label="Open menu"><Icon n="menu" /></button>
        <button className="ibtn collapse-btn" onClick={toggleMini} aria-label={mini ? 'Expand menu' : 'Collapse menu'} title={mini ? 'Expand menu' : 'Collapse menu'}><Icon n={mini ? 'expand' : 'collapse'} /></button>
        <button className="srch" onClick={() => setPal(true)} aria-label="Quick search"><Icon n="search" />Search pages & actions…<kbd>Ctrl K</kbd></button>
        <div className="sp" />
        <a className="btn sm" href={STORE} target="_blank" rel="noreferrer"><Icon n="globe" width={15} height={15} />View site</a>
        <button className="btn sm" onClick={() => openPreview('/').catch(toast.err)}><Icon n="ext" width={15} height={15} />Preview draft</button>
        <Bell />
        <button className="ibtn" onClick={toggleTheme} aria-label="Toggle dark mode" title={dark ? 'Light mode' : 'Dark mode'}><Icon n={dark ? 'sun' : 'moon'} /></button>
      </header>
      {maint && <div role="alert" style={{ background: '#d6453a', color: '#fff', padding: '8px 16px', fontSize: 13.5, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><b>🛠 Website is in maintenance mode</b><span>Visitors see a "back soon" page.</span><Link href="/developer?tab=maintenance" style={{ color: '#fff', textDecoration: 'underline' }}>Manage</Link></div>}
      {me.mustSetup2fa && <div role="alert" style={{ background: '#d98b0b', color: '#fff', padding: '8px 16px', fontSize: 13.5 }}><b>Two-factor authentication is required for your role.</b> <Link href="/account" style={{ color: '#fff', textDecoration: 'underline' }}>Set it up now</Link></div>}
      <main className="main" key={path}>{children}</main><ConfirmHost />
    </div>
    {pal && <Palette cmds={cmds} onClose={() => setPal(false)} onNav={(h) => router.push(h)} />}
  </div>;
}

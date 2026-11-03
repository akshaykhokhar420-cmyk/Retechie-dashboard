'use client';
import { useEffect, useState } from 'react';

/** Full-screen bouncing-laptop loader. Visible in the server HTML, so it shows from the first paint until the app has loaded. */
export default function PageLoader() {
  const [hide, setHide] = useState(false); const [gone, setGone] = useState(false);
  useEffect(() => {
    const done = () => setTimeout(() => setHide(true), 350);
    if (document.readyState === 'complete') done(); else window.addEventListener('load', done, { once: true });
    const t = setTimeout(() => setHide(true), 6000); // never block the UI
    return () => { clearTimeout(t); window.removeEventListener('load', done); };
  }, []);
  useEffect(() => { if (hide) { const t = setTimeout(() => setGone(true), 450); return () => clearTimeout(t); } }, [hide]);
  if (gone) return null;
  return <div id="page-loader" className={hide ? 'hide' : ''} role="status" aria-live="polite">
    <style>{`#page-loader{position:fixed;inset:0;z-index:9999;background:var(--bg,#fff);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;transition:opacity .35s ease,visibility .35s ease}#page-loader.hide{opacity:0;visibility:hidden;pointer-events:none}.lap-bounce{display:flex;flex-direction:column;align-items:center}.lap-ico{animation:lapBounce .9s infinite;transform-origin:center bottom}.lap-shadow{width:36px;height:5px;border-radius:50%;background:#1e293b;margin-top:5px;animation:lapShadow .9s infinite}html[data-theme=dark] .lap-shadow{background:#000}@keyframes lapBounce{0%,100%{transform:translateY(0) scaleX(1.05) scaleY(.95);animation-timing-function:cubic-bezier(.2,.8,.3,1)}50%{transform:translateY(-14px) scaleX(.97) scaleY(1.03);animation-timing-function:cubic-bezier(.55,.06,.68,.19)}}@keyframes lapShadow{0%,100%{transform:scaleX(1);opacity:.22}50%{transform:scaleX(.55);opacity:.07}}.loader-text{font:500 12.5px system-ui,sans-serif;color:#64748b;margin:0}@media(prefers-reduced-motion:reduce){.lap-ico,.lap-shadow{animation:none}}`}</style>
    <div className="lap-bounce">
      <svg className="lap-ico" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" /></svg>
      <span className="lap-shadow" />
    </div>
    <p className="loader-text">Loading...</p>
  </div>;
}

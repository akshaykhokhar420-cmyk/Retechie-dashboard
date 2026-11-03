'use client';
import { useEffect, useRef } from 'react';

declare global { interface Window { tinymce?: any } }
let loading: Promise<void> | null = null;
const loadTiny = () => loading ??= new Promise<void>((res, rej) => {
  if (window.tinymce) return res();
  const s = document.createElement('script'); s.src = '/tinymce/tinymce.min.js'; s.onload = () => res(); s.onerror = () => rej(new Error('Editor failed to load')); document.head.appendChild(s);
});

/** TinyMCE visual editor (self-hosted from /public/tinymce, no external requests). Output is sanitised by the API on save. */
export default function RichEditor({ label, hint, value, onChange, minHeight = 260 }: { label: string; hint?: string; value: string; onChange: (html: string) => void; minHeight?: number }) {
  const ta = useRef<HTMLTextAreaElement>(null); const ed = useRef<any>(null); const cb = useRef(onChange); cb.current = onChange; const latest = useRef(value);
  useEffect(() => {
    let dead = false; const el = ta.current;
    loadTiny().then(() => {
      if (dead || !el || !window.tinymce) return;
      window.tinymce.init({
        target: el, license_key: 'gpl', base_url: '/tinymce', suffix: '.min', promotion: false, branding: false, statusbar: true, resize: true, height: minHeight,
        menubar: 'edit view insert format table tools',
        plugins: 'lists advlist link autolink code table fullscreen searchreplace wordcount visualblocks anchor charmap',
        toolbar: 'undo redo | blocks | bold italic underline strikethrough | bullist numlist outdent indent | link table blockquote hr | removeformat | code fullscreen',
        block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4',
        toolbar_mode: 'wrap', link_default_target: '_blank', link_title: false, relative_urls: false, convert_urls: false,
        valid_elements: 'h2,h3,h4,p,br,b/strong,i/em,u,ul,ol,li,a[href|target|rel],div[class],span[class],blockquote,table,thead,tbody,tr,th[colspan],td[colspan],small,hr',
        content_style: 'body{font:15px/1.65 system-ui,sans-serif;padding:8px 12px;color:#1b1c10}h2{font-size:24px}h3{font-size:19px}a{color:#2f7e41}blockquote{border-left:3px solid #40ab58;margin:8px 0;padding:2px 14px;color:#555}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 10px}',
        setup: (e: any) => {
          ed.current = e;
          e.on('init', () => e.setContent(latest.current || ''));
          e.on('input change keyup undo redo SetContent', () => { const h = e.getContent(); if (h !== latest.current) { latest.current = h; cb.current(h); } });
        },
      });
    }).catch(() => undefined);
    return () => { dead = true; try { ed.current?.remove(); } catch { /* already gone */ } ed.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { latest.current = value; const e = ed.current; if (e?.initialized && e.getContent() !== value) e.setContent(value || ''); }, [value]);
  return <div className="f re"><span style={{ display: 'block', fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{label}</span><textarea ref={ta} defaultValue={value} style={{ width: '100%', minHeight }} />{hint && <small>{hint}</small>}</div>;
}

'use client';
export class ApiError extends Error { constructor(public status: number, message: string, public body?: any) { super(message); } }
let csrf = '';
export const setCsrf = (c: string) => { csrf = c; };
const BASE = '/api/v1/admin';

export async function api<T = any>(method: string, path: string, body?: unknown, opts: { form?: FormData; raw?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== 'GET') headers['x-csrf-token'] = csrf;
  let payload: BodyInit | undefined;
  if (opts.form) payload = opts.form;
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(BASE + path, { method, headers, body: payload, credentials: 'same-origin', cache: 'no-store' });
  const text = await r.text();
  let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (r.ok && r.status !== 204 && text && typeof data === 'string') throw new ApiError(502, 'Server returned an unexpected response. Please retry.');
  if (r.ok && r.status !== 204 && !text && method === 'GET') throw new ApiError(502, 'Server returned an empty response. Please retry.');
  if (!r.ok) {
    const msg = (typeof data?.error === 'string' && data.error) || data?.error?.message || data?.message || (typeof data === 'string' && data) || `Request failed (${r.status})`;
    throw new ApiError(r.status, msg, data);
  }
  return data as T;
}
export const get = <T = any>(p: string) => api<T>('GET', p);
export const post = <T = any>(p: string, b?: unknown) => api<T>('POST', p, b ?? {});
export const put = <T = any>(p: string, b?: unknown) => api<T>('PUT', p, b ?? {});
export const patch = <T = any>(p: string, b?: unknown) => api<T>('PATCH', p, b ?? {});
export const del = <T = any>(p: string) => api<T>('DELETE', p);
export const qs = (o: Record<string, any>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); const s = p.toString(); return s ? '?' + s : ''; };

export const FRONTEND = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
/** Opens the storefront in draft-preview mode (token verified by the API before the storefront sets its cookie). */
export async function openPreview(path = '/') {
  const w = window.open('', '_blank');
  try { const r = await post<{ token: string; frontendUrl: string }>('/preview-token'); const u = `${(r.frontendUrl || FRONTEND).replace(/\/$/, '')}/api/preview?token=${encodeURIComponent(r.token)}&path=${encodeURIComponent(path)}`; if (w) w.location.href = u; else window.location.href = u; }
  catch (e) { w?.close(); throw e; }
}
export const rupees = (v: number | string) => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const when = (s?: string | null) => (s ? new Date(s.endsWith('Z') || s.includes('+') ? s : s.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

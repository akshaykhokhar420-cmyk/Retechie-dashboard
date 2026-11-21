import type { NextRequest } from 'next/server';

// Browser → same-origin /api/v1/* → Retechie API (keeps cookies first-party, no CORS).
// A route handler (not a next.config rewrite) so it behaves the same on every Node host.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API = () => (process.env.API_INTERNAL_URL || 'http://localhost:4000').replace(/\/$/, '');
const DROP_REQ = new Set(['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-port']);
const DROP_RES = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie']);

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params;
  const url = `${API()}/api/v1/${params.path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((v, k) => { if (!DROP_REQ.has(k.toLowerCase())) headers.set(k, v); });
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '').split(',')[0].trim();
  if (ip) headers.set('x-forwarded-for', ip);
  headers.set('x-forwarded-proto', 'https');
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  let up: Response;
  try {
    up = await fetch(url, { method: req.method, headers, body: hasBody ? await req.arrayBuffer() : undefined, redirect: 'manual', cache: 'no-store' });
  } catch {
    return Response.json({ error: 'Store API is unreachable', code: 'upstream_unreachable' }, { status: 502 });
  }
  const out = new Headers();
  up.headers.forEach((v, k) => { if (!DROP_RES.has(k.toLowerCase())) out.set(k, v); });
  for (const c of up.headers.getSetCookie()) out.append('set-cookie', c);
  return new Response([204, 205, 304].includes(up.status) ? null : up.body, { status: up.status, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as HEAD };

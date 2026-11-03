/** @type {import('next').NextConfig} */
const mediaOrigin = (() => { try { return new URL(process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:4000/media').origin; } catch { return ''; } })();
const dev = process.env.NODE_ENV !== 'production';
const csp = ["default-src 'self'", `img-src 'self' data: blob: ${mediaOrigin}`, "style-src 'self' 'unsafe-inline'", `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`, `connect-src 'self'${dev ? " ws: wss:" : ""}`, "font-src 'self' data:", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"].join('; ');
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  // /api/v1/* is served by the route handler in src/app/api/v1/[...path] (rewrites are unreliable on Hostinger)
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Content-Security-Policy', value: csp }] }];
  },
};

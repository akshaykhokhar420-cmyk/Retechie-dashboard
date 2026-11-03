# Retechie dashboard (`dashboard/`)

Admin UI for the whole site. Next.js 14 + TypeScript. Talks only to the Retechie API (`/api/v1/admin/*`, proxied through `next.config.mjs`), using an httpOnly session cookie plus a CSRF header.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3001
npm run typecheck && npm run build && npm start
```

Sign in with the admin created by `npm run seed` in `backend/`.

## Screens (navigation items appear only if your role has the permission)

| Area | Screen |
|---|---|
| Site content | **Text & labels** (search, draft/publish, history, missing report) · **Pages & sections** (builder, reorder, hide, publish, preview) · **Menus & footer** · **Policies** · **FAQs** · **Media library** |
| Catalogue | **Products** (full editor, stock, images, specs, inspection) · **Categories** · **Reviews** (moderation) · **Promotions** (coupons) |
| Sales | **Orders** (status, payment, shipment, returns) · **Customers** · **Support & newsletter** |
| Growth | **SEO** (global, pages, products, categories, policies, robots.txt, sitemap, llms.txt, structured-data preview, validation report, redirects, history) · **Cookies & privacy** (banner, categories, registry, tag integrations, policy versions, consent records, statistics) |
| System | **Settings** · **Users & roles** · **Audit log** · **My account** |

The page-section editor is a generic form generated from each section's JSON (text, rich-text, links, repeatable items with reorder, image pickers) with an *Edit as JSON* escape hatch.

## Security

`X-Frame-Options: DENY`, `noindex`, strict CSP, no secrets in the browser, CSRF header on every write, RBAC enforced by the API (the UI only hides what you can't use).

# Deployment Runbook — Belmont SEO Lab

This guide covers production deployment, configuration, verification, and rollback.

## Prerequisites
- Node.js 18+ and npm
- Environment variables (below) defined for the target environment
- Optional: Vercel CLI if deploying to Vercel

## Required Environment Variables

Set these for production (e.g., in Vercel project settings or your host’s secret manager):

- `NEXT_PUBLIC_SITE_BASE` (required): e.g. `https://seo.example.com`
- `NEXT_PUBLIC_ALLOW_INDEXING` (required): `true` to allow robots/sitemap; `false` for staging
- `OPENAI_API_KEY` (required): server-managed AI routes key
- `OPENAI_DEFAULT_MODEL` (optional): defaults to `gpt-5-mini-2025-08-07`
- `AI_RATE_PER_MINUTE` (optional): default `30`
- `AI_RATE_PER_DAY` (optional): default `100`
- `UPSTASH_REDIS_REST_URL` (recommended): for durable rate limiting
- `UPSTASH_REDIS_REST_TOKEN` (recommended): for durable rate limiting
 - `GA4_MEASUREMENT_ID` (optional/recommended): GA4 Measurement Protocol ID (e.g., G-XXXX)
 - `GA4_API_SECRET` (optional/recommended): GA4 API Secret for server events

Testing/CI helpers (optional):
- `PLAYWRIGHT_BASE_URL`: defaults to `http://localhost:3000`
- `UPDATE_SNAPSHOTS`: `true/false` for visual baselines

## Build and Run

Local/VM:

```
npm ci
npm run build
npm start
```

Vercel:

```
npm i -g vercel
vercel --prod
```

Ensure `NEXT_PUBLIC_SITE_BASE` and `NEXT_PUBLIC_ALLOW_INDEXING` are set per environment.

## Post-Deploy Verification

Run these smoke checks after deployment.

1) Homepage and core routes
- `GET /` should render
- `GET /apps/dashboard` should render

2) Robots & sitemap (PROD only)
- `GET /robots.txt` should be `Allow: /` when `NEXT_PUBLIC_ALLOW_INDEXING=true`
- `GET /sitemap.xml` should contain your `NEXT_PUBLIC_SITE_BASE`

3) Health & AI
- `GET /api/health` → `{ status: "ok" | "warning" }`
  - If Redis is not configured you may see a warning; configure Upstash vars for durability
- `GET /api/ai/status` → `{ hasKey: true }` and expected limits

4) GA4 (optional, if configured)
- `POST /api/ga4/collect` with a minimal payload should return `{ ok: true }`
  - Example JSON body:
    ```json
    {"client_id":"12345.67890","events":[{"name":"book_now","params":{"value":75,"currency":"CAD"}}]}
    ```
  - Verify the event arrives in GA4 DebugView

5) Rate Limiting (optional)
- Hit `/api/ai/chat` repeatedly and verify 429 when limits are exceeded

## Test Suites

Unit:
```
npm test
```

E2E/Visual/A11y (headless):
```
npx playwright install chromium
npx playwright test            # all
npx playwright test tests/e2e  # functional routes
npx playwright test tests/visual
npx playwright test tests/accessibility
```

Quick smoke (faster CI/dev loop):
```
npm run ci:smoke
# includes build + e2e smoke + a11y quick + visual smoke + performance quick
```

Performance (Lighthouse on dashboard):
```
npm run performance
cat tests/performance-results.json
```

Quick variants:
```
npm run performance:quick
npm run load-test:quick
npm run accessibility:quick
npm run visual:smoke
```

## Operational Notes

- Durable Rate Limiting: set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to avoid per-process memory fallback.
- Secrets: rotate `OPENAI_API_KEY` for production; never commit `.env.local`.
- Indexing: `NEXT_PUBLIC_ALLOW_INDEXING` controls `robots.txt` and sitemap generation. Keep `false` on staging.

Environment profiles:
- See `env/.env.production.example` and `env/.env.staging.example` for templates (do not commit secrets).
- In CI/hosting, set environment variables via the provider’s secrets/vars UI instead of `.env.*` files.

## Rollback

- Vercel: use `vercel ls` to find prior deployments, then `vercel alias set <prev-deploy-url> <prod-alias>`.
- Manual host: redeploy the previous successful artifact or rollback the container tag.

## Acceptance Checklist

- [ ] Build is green (`npm run build`)
- [ ] Unit, E2E, Visual, A11y suites pass
- [ ] `/api/health` returns `ok` (or only Redis warning if intentionally not configured)
- [ ] `robots.txt` reflects indexing intent (prod = allow)
- [ ] `OPENAI_API_KEY` rotated and present in prod
- [ ] Redis/Upstash env configured (recommended) for rate limits

# Client Handoff Checklist

Use this list to verify readiness before sharing with the client.

## Configuration
- [ ] `NEXT_PUBLIC_SITE_BASE` points to production domain
- [ ] `NEXT_PUBLIC_ALLOW_INDEXING` is `true` (for prod), `false` for staging
- [ ] `OPENAI_API_KEY` set in prod secrets manager and rotated
- [ ] (Recommended) Upstash Redis vars set for durable rate limiting

## Quality Gates
- [ ] Build successful (`npm run build`)
- [ ] Unit tests passing (`npm test`)
- [ ] E2E tests passing (`npx playwright test tests/e2e`)
- [ ] Visual tests green or reviewed baselines (`tests/visual`)
- [ ] Accessibility tests pass (`tests/accessibility`)
- [ ] Lighthouse performance acceptable (see `tests/performance-results.json`)

## Functional Smoke Checks
- [ ] `/` renders and navigation works (sidebar, top actions)
- [ ] `/apps/dashboard` loads; demo metrics button works
- [ ] `/apps/gsc-ctr-miner` loads; sample data and export work
- [ ] `/apps/utm-qr` builds a link and renders QR preview

## Compliance & SEO
- [ ] `robots.txt` matches indexing intent
- [ ] `sitemap.xml` present and references correct base URL
- [ ] OpenGraph and Twitter images render

## Support & Monitoring
- [ ] `/api/health` OK; address Redis warning (if needed)
- [ ] `/api/ai/status` OK; default model present and limits accurate
- [ ] Log capture/alerting configured (platform-dependent)


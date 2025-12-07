# Changelog

## 2025-12-07

### Security
- **CRITICAL**: Fixed Remote Code Execution (RCE) vulnerability by upgrading Next.js and React
  - Upgraded Next.js from 14.2.32 to 15.5.7 (addresses RSC Flight endpoint RCE exposure)
  - Upgraded React from 18.3.1 to 19.2.1 (removes vulnerable RSC libraries)
  - Upgraded react-dom from 18.3.1 to 19.2.1 (matching React version)
  - Updated @types/react and @types/react-dom to version 19
  - Fixed compatibility issue: removed deprecated `req.ip` property in AI chat route (Next.js 15+ uses x-forwarded-for header only)

### Notes
- This update addresses a critical security vulnerability affecting Next.js 13/14 apps using the App Router
- All existing functionality has been tested and confirmed working after the upgrade
- Build and type checking pass successfully

## 2025-09-05

### Added
- Deployment runbook (`docs/DEPLOYMENT.md`) and client handoff checklist (`docs/CLIENT_HANDOFF_CHECKLIST.md`).
- ARIA improvements: charts now expose `role="img"` and `data-testid="chart"`; navigation landmarks; descriptive ARIA on key buttons.
- Global `:focus-visible` outline to improve keyboard focus visibility (WCAG 2.4.7).

### Fixed
- E2E exports: stabilized GSC CTR Miner export flow and dashboard/export actions.
- Visual tests: robust selectors for forms/charts/loading; updated baseline images for new stable flows.
- Accessibility test harness: reliable axe-core injection and filtering; removed unsupported axe rules.
- Compliance report script: resilient parsing of Playwright JSON for pass/fail metrics.
- Updated visual snapshot for "Dashboard KPI Cards - Data Load Flow" to current UI.

### Changed
- Introduced `data-testid` anchors:
  - `dashboard-load-demo` (dashboard demo button)
  - `gsc-import-btn` (GSC CSV import)
  - `utmqr-label-url`, `utmqr-label-campaign` (UTM-QR labels)
  - `rank-grid-tab-grid` (Rank Grid tab)
- Accessibility tests now use visible-only and testid-based selectors to reduce flakiness.
- Metadata robots now respect `NEXT_PUBLIC_ALLOW_INDEXING` in `src/app/layout.tsx`.

### Notes
- Robots and sitemap are controlled by `NEXT_PUBLIC_ALLOW_INDEXING`. Ensure `true` in production.
- Configure Upstash Redis env vars for durable rate limits; otherwise in-memory fallback is used.
- Rotate `OPENAI_API_KEY` prior to production.
- Google Review link now points to Belmont's Place ID in `src/lib/constants.ts`.

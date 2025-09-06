# Belmont SEO Lab — Client Trial Guide

This guide provides a concise link bundle and a 10‑minute demo script for client testing.

## Trial URLs (Production)
- App: https://seo-lab-echoexes-projects.vercel.app
- Dashboard: https://seo-lab-echoexes-projects.vercel.app/apps/dashboard
- GSC CTR Miner: https://seo-lab-echoexes-projects.vercel.app/apps/gsc-ctr-miner
- UTM Link Builder: https://seo-lab-echoexes-projects.vercel.app/apps/utm-dashboard
- QR Maker: https://seo-lab-echoexes-projects.vercel.app/apps/utm-qr
- Review Links: https://seo-lab-echoexes-projects.vercel.app/apps/review-link
- Review Composer: https://seo-lab-echoexes-projects.vercel.app/apps/review-composer
- GBP Composer: https://seo-lab-echoexes-projects.vercel.app/apps/gbp-composer
- Rank Grid: https://seo-lab-echoexes-projects.vercel.app/apps/rank-grid

Diagnostics:
- Robots: https://seo-lab-echoexes-projects.vercel.app/robots.txt
- Sitemap: https://seo-lab-echoexes-projects.vercel.app/sitemap.xml
- Health: https://seo-lab-echoexes-projects.vercel.app/api/health
- AI Status: https://seo-lab-echoexes-projects.vercel.app/api/ai/status

## 10‑Minute Demo Script
1) Dashboard
- Click "Load Demo Metrics" to populate KPI cards and charts.
- Export a quick metrics CSV from the dashboard snapshot.

2) UTM Link Builder
- In Link Builder, enter booking URL (https://thebelmontbarber.ca/book), choose a preset, click "Build UTM Link".
- Copy the generated URL.

3) QR Maker
- Paste the UTM URL; pick size; generate and download QR code PNG.

4) Review Links
- Verify Google review link is present; copy Email/SMS templates.
- Preview the printable in‑shop review QR card.

5) GSC CTR Miner
- Load Belmont sample data; go to Analytics → "Run Analytics".
- Open Opportunities to view missed clicks; export recommendations.

6) GBP Composer
- Generate a Belmont‑branded post and copy for posting.

7) Rank Grid
- Load demo data in Grid Input; show empty vs populated grid.

## Notes
- Accessibility: WCAG 2.1 AA (100% in automated suite).
- Visual stability: Full baselines captured; responsive views covered.
- Health warning about Redis is informational; production uses in‑memory fallback unless Upstash Redis is configured.


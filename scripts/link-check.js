#!/usr/bin/env node
/*
  Simple internal link checker:
  - Fetches sitemap.xml from the provided base URL (default http://localhost:3000)
  - Extracts <loc> entries
  - Adds a few critical routes for sanity
  - GETs each route and records non-OK statuses
  - Writes a JSON report to tests/link-check-report.json
*/

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const baseUrl = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

async function fetchSitemap() {
  const url = `${baseUrl}/sitemap.xml`;
  try {
    const res = await axios.get(url, { timeout: 20000 });
    return res.data || '';
  } catch (e) {
    console.warn(`Could not fetch sitemap at ${url}: ${e.message}`);
    return '';
  }
}

function extractLocs(xml) {
  const out = new Set();
  const re = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const loc = (m[1] || '').trim();
    if (!loc) continue;
    try {
      const u = new URL(loc);
      if (u.origin === baseUrl) {
        out.add(u.pathname || '/');
      } else if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        out.add(u.pathname || '/');
      }
    } catch {
      // if not absolute, treat as path
      if (loc.startsWith('/')) out.add(loc);
    }
  }
  return Array.from(out);
}

function unique(arr) {
  return Array.from(new Set(arr));
}

async function checkPath(p) {
  try {
    const url = `${baseUrl}${p}`;
    const res = await axios.get(url, { validateStatus: () => true, timeout: 20000 });
    return { path: p, status: res.status };
  } catch (e) {
    return { path: p, status: 0, error: e.message };
  }
}

async function main() {
  const xml = await fetchSitemap();
  let paths = extractLocs(xml);

  // Add critical routes
  const critical = [
    '/',
    '/status',
    '/guide/trial',
    '/apps/dashboard',
    '/apps/utm-dashboard',
    '/apps/review-composer',
    '/apps/rank-grid',
    '/l',
  ];
  for (const p of critical) paths.push(p);
  paths = unique(paths).sort();

  // Add an explicit 404 check
  const notFoundPath = '/does-not-exist';

  const results = [];
  for (const p of paths) {
    results.push(await checkPath(p));
  }
  const notFound = await checkPath(notFoundPath);

  const okStatuses = new Set([200, 301, 302, 308]);
  const failures = results.filter(r => !okStatuses.has(r.status));
  const summary = {
    baseUrl,
    checked: results.length,
    failures: failures.length,
    notFoundExpected: notFound.status === 404,
    failuresList: failures,
    timestamp: new Date().toISOString(),
  };

  const outDir = path.join(process.cwd(), 'tests');
  const outFile = path.join(outDir, 'link-check-report.json');
  try { fs.mkdirSync(outDir, { recursive: true }); } catch {}
  fs.writeFileSync(outFile, JSON.stringify({ summary, results, notFound }, null, 2));
  console.log('Link check summary:', summary);
  console.log(`Report saved to: ${outFile}`);
}

main().catch((e) => {
  console.error('Link check failed:', e);
  process.exit(1);
});

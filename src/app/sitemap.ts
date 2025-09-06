import type { MetadataRoute } from "next";

const appRoutes = [
  "dashboard",
  "onboarding",
  "addon-recommender",
  "citation-tracker",
  "gbp-composer",
  "gsc-ctr-miner",
  "link-map",
  "link-prospect-kit",
  "meta-planner",
  "neighbor-signal",
  "noshow-shield",
  "post-oracle",
  "post-studio",
  "queuetime",
  "rank-grid",
  "rankgrid-watcher",
  "referral-qr",
  "review-composer",
  "review-link",
  "rfm-crm",
  "seo-brief",
  "slot-yield",
  "utm-dashboard",
  "utm-qr",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_BASE || "http://localhost:3000";
  const now = new Date().toISOString();
  const items: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/l`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/status`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${base}/guide/trial`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
  for (const r of appRoutes) {
    items.push({
      url: `${base}/apps/${r}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  return items;
}

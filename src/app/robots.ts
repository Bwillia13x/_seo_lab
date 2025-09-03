import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_BASE || "http://localhost:3000";
  const allowIndex = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
  return allowIndex
    ? {
        rules: { userAgent: "*", allow: "/" },
        sitemap: `${base}/sitemap.xml`,
      }
    : {
        rules: { userAgent: "*", disallow: "/" },
      };
}

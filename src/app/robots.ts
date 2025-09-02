import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://thebelmontbarber.ca";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

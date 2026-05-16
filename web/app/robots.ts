import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_WEB_BASE_URL ?? "http://localhost:3030";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/enhance", "/settings", "/p", "/upgrade"],
        // Don't index user-history or auth callback endpoints
        disallow: ["/history", "/auth", "/login"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}

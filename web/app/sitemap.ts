import type { MetadataRoute } from "next";
import { SCENARIOS } from "@/lib/settingsCards";

const BASE =
  process.env.NEXT_PUBLIC_WEB_BASE_URL ?? "http://localhost:3030";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const top: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, priority: 1.0, changeFrequency: "weekly" },
    { url: `${BASE}/enhance`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${BASE}/settings`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE}/upgrade`, lastModified: now, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/login`, lastModified: now, priority: 0.3, changeFrequency: "yearly" },
  ];

  const scenarios: MetadataRoute.Sitemap = SCENARIOS.map((s) => ({
    url: `${BASE}/settings/${s}`,
    lastModified: now,
    priority: 0.8,
    changeFrequency: "monthly" as const,
  }));

  return [...top, ...scenarios];
}

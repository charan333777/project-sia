import type { MetadataRoute } from "next";
import { api } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";

/** Rebuilt hourly rather than per request, so a crawler cannot drive load on the API. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/create"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Only profiles whose owners opted in. The API returns nothing else, so this file can
  // never become a directory of everyone's contact details by accident.
  let listed: MetadataRoute.Sitemap = [];
  try {
    const profiles = await api.getSearchableProfiles();
    listed = profiles.map((profile) => ({
      url: absoluteUrl(`/u/${profile.username}`),
      lastModified: new Date(profile.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // A sitemap missing its profiles is a far better outcome than a sitemap that 500s.
  }

  return [...staticRoutes, ...listed];
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProfileCard } from "@/components/profile-card";
import { ProfileViewCounter } from "@/components/profile-view-counter";
import { ProfileViralCard } from "@/components/profile-viral-card";
import { api, ApiRequestError } from "@/lib/api";
import { absoluteUrl, siteConfig } from "@/lib/site";

type PageProps = { params: Promise<{ username: string }> };

export const preferredRegion = "fra1";
const loadProfile = cache(async (username: string) => {
  try {
    return await api.getPublicProfile(username);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  try {
    const profile = await loadProfile(username);
    const description = [profile.role, profile.current_context && `Currently: ${profile.current_context}`].filter(Boolean).join(" · ");
    const canonicalPath = `/u/${profile.username}`;
    const imagePath = `${canonicalPath}/opengraph-image`;
    return {
      title: profile.display_name,
      description: description || `Meet ${profile.display_name} on Sia.`,
      alternates: { canonical: canonicalPath },
      robots: {
        index: profile.list_in_search,
        follow: true,
        googleBot: { index: profile.list_in_search, follow: true, "max-image-preview": "large", "max-snippet": -1 },
      },
      openGraph: {
        title: `${profile.display_name} on Sia`,
        description: description || `See what ${profile.display_name} is interested in and open to.`,
        url: canonicalPath,
        siteName: siteConfig.name,
        locale: "en_GB",
        type: "profile",
        images: [{ url: imagePath, width: 1200, height: 630, alt: `${profile.display_name}'s Sia profile` }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${profile.display_name} on Sia`,
        description: description || `Meet ${profile.display_name} on Sia.`,
        images: [imagePath],
      },
    };
  } catch {
    return { title: "Profile", robots: { index: false, follow: false } };
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await loadProfile(username);
  const description = [profile.role, profile.bio].filter(Boolean).join(" — ") || `Meet ${profile.display_name} on Sia.`;
  const publicLinks = profile.contact_items.filter((item) => item.type === "link").map((item) => item.value);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: absoluteUrl(`/u/${profile.username}`),
    dateCreated: profile.created_at,
    dateModified: profile.updated_at,
    mainEntity: {
      "@type": "Person",
      name: profile.display_name,
      identifier: profile.username,
      url: absoluteUrl(`/u/${profile.username}`),
      ...(profile.role ? { jobTitle: profile.role } : {}),
      ...(description ? { description } : {}),
      ...(profile.interests.length > 0 ? { knowsAbout: profile.interests } : {}),
      // Only published links reach the page, because the API already dropped the rest.
      ...(publicLinks.length > 0 ? { sameAs: publicLinks } : {}),
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ProfileViewCounter username={profile.username} />
      <main className="public-shell">
        <p className="public-top-note">Meet {profile.display_name} <span aria-hidden="true">👋</span></p>
        <ProfileCard profile={profile} />
        <ProfileViralCard />
      </main>
    </>
  );
}

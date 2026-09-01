import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { ProfileCard } from "@/components/profile-card";
import { api, ApiRequestError } from "@/lib/api";

type PageProps = { params: Promise<{ username: string }> };

async function loadProfile(username: string) {
  try {
    return await api.getPublicProfile(username);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  try {
    const profile = await api.getPublicProfile(username);
    const description = [profile.role, profile.current_context && `Currently: ${profile.current_context}`].filter(Boolean).join(" · ");
    return {
      title: profile.display_name,
      description: description || `Meet ${profile.display_name} on Sia.`,
      openGraph: { title: `${profile.display_name} on Sia`, description: description || `See what ${profile.display_name} is interested in and open to.`, images: ["/opengraph-image"] },
      twitter: { card: "summary_large_image", title: `${profile.display_name} on Sia`, description: description || `Meet ${profile.display_name} on Sia.`, images: ["/opengraph-image"] },
    };
  } catch {
    return { title: "Profile" };
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await loadProfile(username);
  return (
    <main className="public-shell">
      <p className="public-top-note">Meet {profile.display_name} <span aria-hidden="true">👋</span></p>
      <ProfileCard profile={profile} />
      <section className="viral-card">
        <span><Sparkles size={17} /> Make hello easier</span>
        <ButtonLink href="/create" variant="quiet">Create mine <ArrowRight size={17} /></ButtonLink>
      </section>
    </main>
  );
}

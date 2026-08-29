import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
      openGraph: { title: `${profile.display_name} on Sia`, description: description || `See what ${profile.display_name} is interested in and open to.`, images: [] },
      twitter: { card: "summary", title: `${profile.display_name} on Sia`, description: description || `Meet ${profile.display_name} on Sia.`, images: [] },
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
      <p className="public-top-note">You’ve found {profile.display_name} on Sia.</p>
      <ProfileCard profile={profile} />
      <section className="viral-card">
        <h2>Want your own Sia?</h2>
        <p>Create a profile that helps people around you know who you are and what you’re open to.</p>
        <div className="viral-actions"><ButtonLink href="/create">Create your profile</ButtonLink><ButtonLink href="/login" variant="secondary">Log in</ButtonLink></div>
      </section>
    </main>
  );
}

import { ImageResponse } from "next/og";
import { api } from "@/lib/api";

export const alt = "Public Sia profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ProfileOpenGraphImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let name = `@${username}`;
  let role = "Meet me on Sia";
  let context = "A small profile for real-life moments.";

  try {
    const profile = await api.getPublicProfile(username);
    name = profile.display_name;
    role = profile.role || `@${profile.username}`;
    context = profile.current_context || profile.bio || "See what I’m interested in and open to.";
  } catch {
    // The image still provides a useful branded fallback if a profile becomes private.
  }

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f3ed", color: "#191919", fontFamily: "sans-serif" }}>
      <div style={{ width: 1010, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 70 }}>
        <div style={{ width: 750, display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#526fae", fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>SIA PROFILE</span>
          <strong style={{ marginTop: 25, fontSize: 76, lineHeight: 1.02, letterSpacing: -3 }}>{name}</strong>
          <span style={{ marginTop: 17, color: "#454341", fontSize: 32 }}>{role}</span>
          <span style={{ maxWidth: 720, marginTop: 28, color: "#686663", fontSize: 25, lineHeight: 1.35 }}>{context}</span>
        </div>
        <div style={{ width: 190, height: 190, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #d5ddec", borderRadius: 999, background: "#e8edf8", color: "#526fae", fontSize: 84, fontWeight: 700 }}>
          {name.slice(0, 1).toUpperCase()}
        </div>
      </div>
    </div>,
    size,
  );
}

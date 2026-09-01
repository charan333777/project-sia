import { ImageResponse } from "next/og";

export const alt = "Sia — Make hello easier";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f3ed", color: "#191919", fontFamily: "sans-serif" }}>
      <div style={{ width: 990, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#526fae", fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>SIA</span>
          <strong style={{ width: 650, marginTop: 22, fontSize: 82, lineHeight: 1.02, letterSpacing: -4 }}>Make hello easier.</strong>
          <span style={{ marginTop: 28, color: "#686663", fontSize: 30 }}>A small profile for real-life moments.</span>
        </div>
        <div style={{ width: 220, height: 300, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #ddd6cc", borderRadius: 48, background: "#fffdfc", boxShadow: "0 24px 55px rgba(48,43,38,.12)" }}>
          <span style={{ width: 112, height: 112, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "#e8edf8", color: "#526fae", fontSize: 58, fontWeight: 700 }}>S</span>
        </div>
      </div>
    </div>,
    size,
  );
}

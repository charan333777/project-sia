/**
 * The Sia mark on its blue tile, drawn for `ImageResponse` wherever a bitmap is required —
 * home-screen icons cannot be SVG. Same paths as `app/icon.svg`. The tile is full-bleed
 * because every home screen applies its own rounded mask; `markScale` shrinks the mark into
 * the safe zone of a maskable icon, which may be cropped to a circle.
 *
 * The loops' strokes reach just past the 64-unit box, which a bitmap would clip, so the
 * viewBox carries four units of room on every side.
 */
export function AppIconArt({ size, markScale = 0.82 }: { size: number; markScale?: number }) {
  const mark = Math.round(size * markScale);
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#617fc0" }}>
      <svg width={mark} height={mark} viewBox="-4 -4 72 72">
        <path
          d="M28 18c-7-6-17-5-23 2s-5 17 2 23c6 5 15 5 21 0M36 46c7 6 17 5 23-2s5-17-2-23c-6-5-15-5-21 0M21 32h22"
          fill="none"
          stroke="#ffffff"
          strokeWidth={5}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

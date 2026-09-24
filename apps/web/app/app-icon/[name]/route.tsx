import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/app-icon";

/**
 * Bitmap icons for the web app manifest. Android needs PNGs for the home screen, and a
 * separate maskable one whose mark stays inside the circle the launcher may crop it to.
 */
const variants = {
  "192.png": { size: 192, markScale: undefined },
  "512.png": { size: 512, markScale: undefined },
  "maskable.png": { size: 512, markScale: 0.7 },
} as const;

type Variant = keyof typeof variants;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(variants).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const variant = variants[name as Variant];
  if (!variant) return new Response("Not found", { status: 404 });
  return new ImageResponse(<AppIconArt size={variant.size} markScale={variant.markScale} />, {
    width: variant.size,
    height: variant.size,
  });
}

"use client";

import { EllipsisVertical, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getInstallPrompt, showInstallPrompt, subscribeToInstallPrompt } from "@/lib/install-prompt";
import { Button } from "./button";

type Platform = "ios" | "android";

const dismissedKey = "sia:home-screen-tip";

function detectPlatform(): Platform | null {
  const agent = navigator.userAgent;
  // iPadOS asks for the desktop site, so it reports itself as a Mac with a touch screen.
  if (/iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(agent)) return "android";
  return null;
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function wasDismissed() {
  try {
    return window.localStorage.getItem(dismissedKey) === "dismissed";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(dismissedKey, "dismissed");
  } catch {
    // Private browsing: the tip simply comes back next time.
  }
}

/**
 * Offers to put Sia on the home screen, and only here: an iPhone adds the page you are on,
 * so adding from the QR page is what makes the icon open straight to the code. Android
 * follows the manifest's start_url, which points here too. Phones only, never inside the
 * installed app, and not again once dismissed on this device.
 */
export function HomeScreenTip() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const installPrompt = useSyncExternalStore(subscribeToInstallPrompt, getInstallPrompt, () => null);

  useEffect(() => {
    if (!isInstalled() && !wasDismissed()) setPlatform(detectPlatform());
  }, []);

  if (!platform) return null;
  const dismiss = () => {
    rememberDismissed();
    setPlatform(null);
  };
  const install = async () => {
    if ((await showInstallPrompt()) === "accepted") dismiss();
  };

  return (
    <aside className="home-screen-tip" aria-labelledby="home-screen-tip-heading">
      <span className="home-screen-tip-icon" aria-hidden="true"><Smartphone size={20} /></span>
      <div className="home-screen-tip-copy">
        <strong id="home-screen-tip-heading">Your QR, one tap away</strong>
        {platform === "ios" ? (
          <p>Tap <Share size={14} role="img" aria-label="Share" /> then <b>Add to Home Screen</b>. The icon opens straight to this code.</p>
        ) : installPrompt ? (
          <p>Add Sia to your home screen and the icon opens straight to this code.</p>
        ) : (
          <p>In your browser menu <EllipsisVertical size={14} role="img" aria-label="menu" /> choose <b>Add to Home screen</b>. The icon opens straight to this code.</p>
        )}
        {platform === "android" && installPrompt && <Button className="home-screen-tip-add" onClick={() => void install()}>Add to Home screen</Button>}
      </div>
      <button type="button" className="home-screen-tip-close" aria-label="Dismiss home screen tip" onClick={dismiss}><X size={16} /></button>
    </aside>
  );
}

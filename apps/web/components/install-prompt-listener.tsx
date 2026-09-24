"use client";

import { useEffect } from "react";
import { listenForInstallPrompt } from "@/lib/install-prompt";

/** Mounted once in the root layout so the install prompt is caught on whichever page it fires. */
export function InstallPromptListener() {
  useEffect(() => listenForInstallPrompt(), []);
  return null;
}

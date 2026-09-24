/**
 * Chrome's install prompt arrives once per page load, usually before the page that wants
 * it has mounted, so it is caught app-wide and parked here until the QR page asks for it.
 * Safari never fires it; on an iPhone the tip explains the Share menu instead.
 */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function listenForInstallPrompt() {
  const capture = (event: Event) => {
    // Chrome's own banner would offer the app on any page, including to people who only
    // scanned someone else's code. The offer belongs on the QR page, where it is explained.
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  };
  const installed = () => {
    deferred = null;
    notify();
  };
  window.addEventListener("beforeinstallprompt", capture);
  window.addEventListener("appinstalled", installed);
  return () => {
    window.removeEventListener("beforeinstallprompt", capture);
    window.removeEventListener("appinstalled", installed);
  };
}

export function getInstallPrompt() {
  return deferred;
}

export function subscribeToInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shows the browser's install dialog. A prompt can only be used once, so it is spent here. */
export async function showInstallPrompt() {
  const event = deferred;
  if (!event) return "unavailable" as const;
  deferred = null;
  notify();
  await event.prompt();
  return (await event.userChoice).outcome;
}

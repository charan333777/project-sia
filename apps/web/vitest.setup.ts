import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// The profile form only needs the router to exist; assertions are about what renders.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// jsdom implements neither, and the form scrolls its heading between steps.
Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();

afterEach(() => cleanup());

import type { KeyboardEvent } from "react";

/** Roving focus for the styled radio buttons used throughout Sia. */
export function moveRadioSelection(event: KeyboardEvent<HTMLElement>) {
  const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
    : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
  if (!direction && event.key !== "Home" && event.key !== "End") return;
  const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
  if (!radios.length) return;
  const current = radios.indexOf(document.activeElement as HTMLButtonElement);
  const index = event.key === "Home" ? 0 : event.key === "End" ? radios.length - 1
    : (Math.max(0, current) + direction + radios.length) % radios.length;
  event.preventDefault();
  radios[index]?.focus();
  radios[index]?.click();
}

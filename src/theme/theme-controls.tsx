"use client";

import { useSyncExternalStore } from "react";
import { storageKey, themes, type Mode, type Theme } from "./config";

function snapshot() {
  const { theme, mode, preference } = document.documentElement.dataset;
  return `${theme}|${mode}|${preference}`;
}
function subscribe(notify: () => void) {
  const root = document.documentElement;
  const observer = new MutationObserver(notify);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-theme", "data-mode", "data-preference"],
  });
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (root.dataset.preference === "system")
      root.dataset.mode = media.matches ? "dark" : "light";
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    let saved: { theme?: unknown; mode?: unknown } = {};
    try {
      saved = JSON.parse(event.newValue || "{}") || {};
    } catch {}
    root.dataset.theme = themes.includes(saved.theme as Theme)
      ? String(saved.theme)
      : "retro-mix";
    root.dataset.preference =
      saved.mode === "light" || saved.mode === "dark" ? saved.mode : "system";
    root.dataset.mode =
      root.dataset.preference === "system"
        ? media.matches
          ? "dark"
          : "light"
        : root.dataset.preference;
  };
  onSystem();
  media.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}
function update(theme: Theme, preference: Mode | "system") {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.preference = preference;
  root.dataset.mode =
    preference === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ theme, mode: preference }),
    );
  } catch {
    /* Preferences still work when storage is blocked. */
  }
}
const labels: Record<Theme, string> = {
  "retro-mix": "RETRO MIX",
  nes: "8-BIT",
  snes: "16-BIT",
  n64: "64-BIT",
};

export function ThemeControls() {
  const state = useSyncExternalStore(subscribe, snapshot, () => null);
  const [theme = "retro-mix", mode = "light", preference = "system"] = state?.split("|") ?? [];
  return <div className="theme-controls" role="group" aria-label="Site appearance">
    <div className="generation-menu" role="group" aria-label="Visual generation">
      <span className="generation-label">CHOOSE YOUR ERA</span>
      {themes.map(value => <button key={value} type="button" disabled={!state} aria-pressed={theme === value} onClick={() => update(value, preference as Mode | "system")}>{labels[value]}</button>)}
    </div>
    <div className="color-controls">
      <button type="button" disabled={!state} aria-label="Dark mode" aria-pressed={state ? mode === "dark" : false} onClick={() => update(theme as Theme, mode === "dark" ? "light" : "dark")}><span aria-hidden="true">◐</span> DARK</button>
      <button type="button" disabled={!state} aria-label="Use system color preference" aria-pressed={preference === "system"} onClick={() => update(theme as Theme, "system")}>AUTO</button>
    </div>
  </div>;
}

export const themes = ["retro-mix", "nes", "snes", "n64"] as const;
export type Theme = (typeof themes)[number];
export type Mode = "light" | "dark";
export const storageKey = "nitros-appearance";

// Fixed application code only: never interpolate user content into this script.
// Runs before first paint, independently of the React bundle.
export const themeScript = `(() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("${storageKey}") || "{}") || {}; } catch {}
  const root = document.documentElement;
  root.dataset.theme = ${JSON.stringify(themes)}.includes(saved.theme) ? saved.theme : "retro-mix";
  root.dataset.mode = ["light", "dark"].includes(saved.mode) ? saved.mode : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  root.dataset.preference = ["light", "dark"].includes(saved.mode) ? saved.mode : "system";
})();`;

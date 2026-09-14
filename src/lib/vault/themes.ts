import type { ThemeName } from "./types";

export const THEME_OPTIONS: { id: ThemeName; label: string; hint: string }[] = [
  { id: "night", label: "暗夜", hint: "极客夜色，默认" },
  { id: "paper", label: "素纸", hint: "日间阅读" },
  { id: "forest", label: "林间", hint: "护眼绿调" },
  { id: "ocean", label: "深海", hint: "沉静蓝调" },
];

export function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme !== "paper");
}

export const CANVAS_PRESETS = [
  { mode: "eyecare" as const, label: "豆沙绿", bg: "#c7edcc", fg: "#123016" },
  { mode: "parchment" as const, label: "羊皮纸", bg: "#fbf0d9", fg: "#2d251d" },
  { mode: "dark" as const, label: "纯黑", bg: "#000000", fg: "#e4e4e7" },
];

export const TINT_CLASS: Record<string, string> = {
  slate: "text-muted-foreground",
  blue: "text-primary",
  teal: "text-success",
  rose: "text-destructive",
  amber: "text-warning",
};

import { create } from "zustand";

const STORAGE_KEY = "cloudchat-theme";

const systemTheme = () =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}


export function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {

  }
  const theme = saved === "dark" || saved === "light" ? saved : systemTheme();
  applyTheme(theme);
  return theme;
}

export const useTheme = create((set, get) => ({
  theme: "light",
  init: () => set({ theme: initTheme() }),
  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {

    }
    applyTheme(next);
    set({ theme: next });
  },
}));

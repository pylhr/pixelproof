"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "pp-theme";

/** Runs before first paint (inlined in layout.tsx) to avoid a flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.dataset.theme=d?'dark':'light';e.dataset.themePref=p;e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

interface ThemeState {
  pref: ThemePref;
  resolved: "light" | "dark";
  setPref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function isThemePref(v: unknown): v is ThemePref {
  return v === "light" || v === "dark" || v === "system";
}

function resolve(pref: ThemePref): "light" | "dark" {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(pref: ThemePref): "light" | "dark" {
  const resolved = resolve(pref);
  const el = document.documentElement;
  el.dataset.theme = resolved;
  el.dataset.themePref = pref;
  el.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Sync React state with what the init script already applied to <html>.
  useEffect(() => {
    const initial = document.documentElement.dataset.themePref;
    const p = isThemePref(initial) ? initial : "system";
    setPrefState(p);
    setResolved(resolve(p));
  }, []);

  // Follow OS changes while the preference is "system".
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    setResolved(apply(next));
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage unavailable (private mode): the preference simply won't persist */
    }
  }, []);

  const value = useMemo(() => ({ pref, resolved, setPref }), [pref, resolved, setPref]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

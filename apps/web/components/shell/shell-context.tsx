"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface ShellState {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const ShellContext = createContext<ShellState | null>(null);
const SIDEBAR_KEY = "pp-sidebar-collapsed";

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_KEY) === "1") setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed, hydrated]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);

  // Global shortcuts: Ctrl/Cmd+K palette, Ctrl/Cmd+B sidebar.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  const value = useMemo(
    () => ({ paletteOpen, setPaletteOpen, sidebarCollapsed, toggleSidebar }),
    [paletteOpen, sidebarCollapsed, toggleSidebar],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <ShellProvider>");
  return ctx;
}

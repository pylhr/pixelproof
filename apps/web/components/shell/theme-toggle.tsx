"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePref } from "@/lib/theme";

const ORDER: ThemePref[] = ["light", "dark", "system"];
const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeToggle() {
  const { pref, setPref } = useTheme();
  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length] ?? "system";
  const Icon = ICONS[pref];
  return (
    <button
      type="button"
      onClick={() => setPref(next)}
      aria-label={`Theme: ${pref}. Switch to ${next}.`}
      title={`Theme: ${pref}`}
      className="inline-flex size-8 items-center justify-center rounded-control text-fg-2 transition-colors duration-150 hover:bg-raised hover:text-fg"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

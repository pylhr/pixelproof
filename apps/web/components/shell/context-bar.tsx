"use client";

import { ArrowLeftRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { useModKey } from "@/lib/platform";
import { ApiStatusPill } from "./api-status";
import { useShell } from "./shell-context";
import { ThemeToggle } from "./theme-toggle";

/** Present on every module so the active comparison persists across lenses.
 *  There is no comparison model yet (M2+), so it shows an honest empty state. */
export function ContextBar() {
  const { setPaletteOpen } = useShell();
  const mod = useModKey();
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <div className="flex min-w-0 items-center gap-2 text-ui text-fg-2">
        <span className="rounded-control border border-dashed border-line-strong px-1.5 text-micro text-fg-3">A</span>
        <ArrowLeftRight className="size-3.5 shrink-0 text-fg-3" aria-hidden />
        <span className="rounded-control border border-dashed border-line-strong px-1.5 text-micro text-fg-3">B</span>
        <span className="hidden truncate sm:inline">No active comparison</span>
        <Badge tone="planned" className="hidden md:inline-flex">Planned · M2</Badge>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ApiStatusPill />
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Open command palette"
          className="inline-flex h-8 items-center gap-2 rounded-control border border-line-strong bg-surface px-2.5 text-ui text-fg-2 transition-colors duration-150 hover:bg-raised hover:text-fg"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Search or jump to…</span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Kbd>{mod}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}

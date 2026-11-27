"use client";

import { ArrowLeftRight, Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { SampleBadge } from "@/components/workspace/sample-badge";
import { useComparison } from "@/components/workspace/comparison-context";
import { useModKey } from "@/lib/platform";
import { ApiStatusPill } from "./api-status";
import { useShell } from "./shell-context";
import { ThemeToggle } from "./theme-toggle";

/** Present on every module so the active comparison persists across lenses.
 *  Until M2/M3 the active comparison is the fictional sample, and says so. */
export function ContextBar() {
  const { setPaletteOpen } = useShell();
  const comparison = useComparison();
  const mod = useModKey();
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <div className="flex min-w-0 items-center gap-2 text-ui text-fg-2" role="group" aria-label="Active comparison">
        <span className="rounded-control border border-line-strong px-1.5 text-micro text-fg-2">A</span>
        <span className="font-medium text-fg">{comparison.before.label}</span>
        <ArrowLeftRight className="size-3.5 shrink-0 text-fg-3" aria-hidden />
        <span className="rounded-control border border-line-strong px-1.5 text-micro text-fg-2">B</span>
        <span className="font-medium text-fg">{comparison.after.label}</span>
        <span className="hidden truncate sm:inline">· {comparison.title}</span>
        {comparison.isSample && <SampleBadge className="hidden md:inline-flex" />}
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

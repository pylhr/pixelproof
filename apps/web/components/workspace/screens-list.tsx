"use client";

import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import type { Comparison } from "@/lib/comparison/types";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-US");

/** Left pane for the visual lens: the screen pair and, once analysed, the changed regions.
 *  Regions are observations (where pixels differ), not claims about what changed or why. */
export function ScreensList({
  comparison,
  fileQuery,
  selectedRegion,
  onSelectRegion,
}: {
  comparison: Comparison;
  fileQuery: string;
  selectedRegion: number | null;
  onSelectRegion: (id: number | null) => void;
}) {
  const { screen, analysis } = comparison;
  const regions = analysis?.regions ?? [];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (regions.length === 0) return;
    const idx = regions.findIndex((r) => r.id === selectedRegion);
    let next = -1;
    if (e.key === "ArrowDown") next = idx < 0 ? 0 : Math.min(idx + 1, regions.length - 1);
    else if (e.key === "ArrowUp") next = idx < 0 ? 0 : Math.max(idx - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = regions.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const r = regions[next];
    if (r) onSelectRegion(r.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <section className="border-b border-line p-3" aria-labelledby="screens-h">
        <h3 id="screens-h" className="mb-2 text-small font-medium text-fg-2">Screens</h3>
        <div aria-current="true" className="rounded-control bg-accent-soft px-2.5 py-2">
          <p className="truncate text-ui font-medium text-fg" title={screen.name}>{screen.name}</p>
          <p className="mt-0.5 truncate text-small text-fg-3">
            {analysis
              ? `${analysis.before.width}×${analysis.before.height} → ${analysis.after.width}×${analysis.after.height}`
              : `${comparison.before.label} → ${comparison.after.label} · ${screen.before.width}×${screen.before.height}`}
          </p>
        </div>
      </section>

      <section className="border-b border-line p-3" aria-labelledby="regions-h">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 id="regions-h" className="text-small font-medium text-fg-2">Changed regions</h3>
          {analysis && <span className="text-small text-fg-3">{analysis.metrics.regions_total}</span>}
        </div>
        {!analysis ? (
          <EmptyState
            icon={<ScanSearch className="size-5" aria-hidden />}
            title="Not computed"
            description="Run an analysis to measure where the two screenshots differ. No regions are guessed."
            className="py-6"
          />
        ) : regions.length === 0 ? (
          <p className="py-3 text-small text-fg-2">No pixels differ by more than the tolerance (ΔE {analysis.params.tolerance}).</p>
        ) : (
          <>
            <div
              role="listbox"
              tabIndex={0}
              aria-label="Changed regions"
              aria-activedescendant={selectedRegion !== null ? `region-opt-${selectedRegion}` : undefined}
              onKeyDown={onKeyDown}
              className="-mx-1.5 max-h-80 overflow-y-auto p-1.5"
            >
              {regions.map((r) => (
                <div
                  key={r.id}
                  id={`region-opt-${r.id}`}
                  role="option"
                  aria-selected={r.id === selectedRegion}
                  onClick={() => onSelectRegion(r.id === selectedRegion ? null : r.id)}
                  className={cn(
                    "cursor-pointer rounded-control px-2.5 py-1.5 transition-colors duration-150",
                    r.id === selectedRegion ? "bg-accent-soft" : "hover:bg-raised",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 text-ui text-fg">
                    <span className="font-medium">Region {r.id}</span>
                    <span className="font-mono text-small">{fmt(r.changed_pixels)} px</span>
                  </div>
                  <p className="font-mono text-small text-fg-3">
                    x {r.x}, y {r.y} · {r.width}×{r.height} · mean ΔE {r.mean_delta_e}
                  </p>
                </div>
              ))}
            </div>
            {analysis.regions_truncated && (
              <p className="mt-1 text-small text-fg-3">
                Showing the {regions.length} largest of {analysis.metrics.regions_total} regions.
              </p>
            )}
          </>
        )}
      </section>

      {comparison.files.length > 0 && (
        <section className="p-3" aria-labelledby="src-h">
          <h3 id="src-h" className="mb-1 text-small font-medium text-fg-2">Source changes</h3>
          <p className="text-small text-fg-2">
            {comparison.files.length} files changed in this comparison.{" "}
            <Link href={`/code${fileQuery}`} className="text-accent underline-offset-2 hover:underline">
              View in Code
            </Link>
          </p>
          <p className="mt-1 text-small text-fg-3">Which changes affect this screen is not analysed yet (M6).</p>
        </section>
      )}
      {comparison.files.length === 0 && (
        <section className="p-3">
          <h3 className="mb-1 text-small font-medium text-fg-2">Source changes</h3>
          <p className="text-small text-fg-3">Importing source code to compare arrives in M3.</p>
        </section>
      )}
    </div>
  );
}


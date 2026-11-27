import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import type { Comparison } from "@/lib/comparison/types";
import { PlannedBadge } from "./sample-badge";

/** Left pane for the visual lens: the screen pair under comparison. Changed regions
 *  need pixel analysis (M2), so that section says so rather than showing invented regions. */
export function ScreensList({ comparison, fileQuery }: { comparison: Comparison; fileQuery: string }) {
  const { screen } = comparison;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <section className="border-b border-line p-3" aria-labelledby="screens-h">
        <h3 id="screens-h" className="mb-2 text-small font-medium text-fg-2">Screens</h3>
        <div aria-current="true" className="rounded-control bg-accent-soft px-2.5 py-2">
          <p className="text-ui font-medium text-fg">{screen.name}</p>
          <p className="mt-0.5 text-small text-fg-3">
            {comparison.before.label} → {comparison.after.label} · {screen.before.width}×{screen.before.height}
          </p>
        </div>
      </section>

      <section className="border-b border-line p-3" aria-labelledby="regions-h">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 id="regions-h" className="text-small font-medium text-fg-2">Changed regions</h3>
          <PlannedBadge milestone="M2" />
        </div>
        <EmptyState
          icon={<ScanSearch className="size-5" aria-hidden />}
          title="Not computed"
          description="Region detection needs pixel analysis, which is built in M2. No regions are guessed here."
          className="py-6"
        />
      </section>

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
    </div>
  );
}

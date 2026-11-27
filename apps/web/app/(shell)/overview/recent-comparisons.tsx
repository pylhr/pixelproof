"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { useComparison } from "@/components/workspace/comparison-context";
import { SampleBadge } from "@/components/workspace/sample-badge";

/** Lists the active comparison. Until M2/M3 that is the fictional sample, labelled as such. */
export function RecentComparisons() {
  const c = useComparison();
  return (
    <Panel title="Recent comparisons" description="Comparisons you can open in the workspace." flush>
      <ul className="divide-y divide-line">
        <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-ui font-medium text-fg">{c.title}</p>
              {c.isSample && <SampleBadge />}
            </div>
            <p className="mt-0.5 text-small text-fg-2">
              {c.before.label} → {c.after.label} · 1 screen · {c.files.length} changed files
            </p>
          </div>
          <div className="flex items-center gap-3 text-ui">
            <Link href="/visual" className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline">
              Open visual <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <Link href="/code" className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline">
              Open code <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </li>
      </ul>
    </Panel>
  );
}

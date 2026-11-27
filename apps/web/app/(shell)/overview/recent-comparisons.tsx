"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApiHealth } from "@/components/shell/api-health";
import { Panel } from "@/components/ui/panel";
import { useComparison } from "@/components/workspace/comparison-context";
import { SampleBadge } from "@/components/workspace/sample-badge";
import { listVisualComparisons } from "@/lib/visual-api";
import type { VisualResult } from "@/lib/visual-types";

const linkCls = "inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline";

/** The fictional sample, followed by real comparisons stored by the local API. */
export function RecentComparisons() {
  const c = useComparison();
  const api = useApiHealth();
  const [items, setItems] = useState<VisualResult[]>([]);
  const online = api.kind === "online";

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    listVisualComparisons()
      .then((r) => {
        if (!cancelled) setItems(r);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [online]);

  return (
    <Panel title="Recent comparisons" description="Comparisons you can open in the workspace." flush>
      <ul className="divide-y divide-line">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" data-testid="recent-item">
            <div className="min-w-0 flex-1">
              <p className="truncate text-ui font-medium text-fg">
                {r.before.name} → {r.after.name}
              </p>
              <p className="mt-0.5 text-small text-fg-2">
                {new Date(r.created_at).toLocaleString()} · {r.metrics.changed_percent.toFixed(2)}% changed · {r.metrics.regions_total} regions
              </p>
            </div>
            <Link href={`/visual?cmp=${r.id}`} className={`${linkCls} text-ui`}>
              Open <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </li>
        ))}
        <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-ui font-medium text-fg">{c.isSample ? c.title : "Acme settings page"}</p>
              <SampleBadge />
            </div>
            <p className="mt-0.5 text-small text-fg-2">Fictional example · 1 screen · 6 changed files</p>
          </div>
          <div className="flex items-center gap-3 text-ui">
            <Link href="/visual" className={linkCls}>
              Open visual <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <Link href="/code" className={linkCls}>
              Open code <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </li>
      </ul>
    </Panel>
  );
}

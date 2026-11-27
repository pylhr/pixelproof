"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FileChange } from "@/lib/comparison/types";
import { DIFF_LAYOUTS, VISUAL_VIEWS, ZOOMS, parseComparisonId, pick } from "@/lib/comparison/workspace-params";

type Key = "view" | "layout" | "zoom" | "file" | "cmp" | "new";
/** A string sets the parameter; null removes it. */
type Patch = Partial<Record<Key, string | null>>;

/** Workspace state lives in the URL so views are shareable and survive reload.
 *  Every value is validated; unknown input falls back to a default. */
export function useWorkspaceParams(files: readonly FileChange[]) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const view = pick(sp.get("view"), VISUAL_VIEWS, "slider");
  const layout = pick(sp.get("layout"), DIFF_LAYOUTS, "unified");
  const zoom = pick(sp.get("zoom"), ZOOMS, "fit");
  const fileId = files.find((f) => f.id === sp.get("file"))?.id ?? files[0]?.id ?? null;
  const cmp = parseComparisonId(sp.get("cmp"));
  const newOpen = sp.get("new") === "1";

  const query = sp.toString();
  const update = useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams(query);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else if (v !== undefined) next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [query, pathname, router],
  );

  return { view, layout, zoom, fileId, cmp, newOpen, update };
}

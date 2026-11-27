"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FileChange } from "@/lib/comparison/types";
import { DIFF_LAYOUTS, VISUAL_VIEWS, ZOOMS, pick } from "@/lib/comparison/workspace-params";

type Patch = Partial<Record<"view" | "layout" | "zoom" | "file", string>>;

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

  const query = sp.toString();
  const update = useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams(query);
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) next.set(k, v);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [query, pathname, router],
  );

  return { view, layout, zoom, fileId, update };
}

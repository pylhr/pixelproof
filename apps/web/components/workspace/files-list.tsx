"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSearch } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import type { FileChange, FileStatus } from "@/lib/comparison/types";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<FileStatus, string> = { added: "Added", modified: "Modified", deleted: "Deleted" };
export const STATUS_TONE: Record<FileStatus, BadgeTone> = { added: "added", modified: "modified", deleted: "removed" };

type Filter = "all" | FileStatus;
const FILTERS = [
  { value: "all", label: "All" },
  { value: "added", label: "Added" },
  { value: "modified", label: "Modified" },
  { value: "deleted", label: "Deleted" },
] as const satisfies readonly { value: Filter; label: string }[];

function splitPath(path: string) {
  const i = path.lastIndexOf("/");
  return { dir: i >= 0 ? path.slice(0, i + 1) : "", name: path.slice(i + 1) };
}

export function FilesList({
  files,
  selectedId,
  onSelect,
}: {
  files: readonly FileChange[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Filter>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((f) => (status === "all" || f.status === status) && (!q || f.path.toLowerCase().includes(q)));
  }, [files, query, status]);

  const activeVisible = visible.some((f) => f.id === selectedId);

  useEffect(() => {
    if (selectedId) document.getElementById(`file-opt-${selectedId}`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (visible.length === 0) return;
    const idx = visible.findIndex((f) => f.id === selectedId);
    let next = -1;
    if (e.key === "ArrowDown") next = idx < 0 ? 0 : Math.min(idx + 1, visible.length - 1);
    else if (e.key === "ArrowUp") next = idx < 0 ? 0 : Math.max(idx - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = visible.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const f = visible[next];
    if (f) onSelect(f.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-line p-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter files…"
          aria-label="Filter files"
        />
        <Segmented label="Filter by status" value={status} onChange={setStatus} options={FILTERS} className="w-full" />
      </div>

      <p className="px-3 pt-2 text-small text-fg-3" aria-live="polite">
        {visible.length} of {files.length} files
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={<FileSearch className="size-5" aria-hidden />}
          title="No files match"
          description="Clear the filter or choose a different status."
          className="py-8"
        />
      ) : (
        <div
          role="listbox"
          tabIndex={0}
          aria-label="Changed files"
          aria-activedescendant={activeVisible && selectedId ? `file-opt-${selectedId}` : undefined}
          onKeyDown={onKeyDown}
          className="min-h-0 flex-1 overflow-y-auto p-1.5"
        >
          {visible.map((f) => {
            const { dir, name } = splitPath(f.path);
            const selected = f.id === selectedId;
            return (
              <div
                key={f.id}
                id={`file-opt-${f.id}`}
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(f.id)}
                className={cn(
                  "cursor-pointer rounded-control px-2.5 py-2 transition-colors duration-150",
                  selected ? "bg-accent-soft" : "hover:bg-raised",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-ui font-medium text-fg">{name}</span>
                  <Badge tone={STATUS_TONE[f.status]}>{STATUS_LABEL[f.status]}</Badge>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-small text-fg-3">
                  <span className="truncate font-mono">{dir || "/"}</span>
                  <span className="shrink-0 font-mono">
                    <span className="text-added">+{f.additions}</span> <span className="text-removed">−{f.deletions}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Fragment } from "react";
import { EmptyState } from "@/components/ui/states";
import { toSplitRows, type SplitCell } from "@/lib/comparison/split-rows";
import type { DiffLine, FileChange } from "@/lib/comparison/types";
import type { DiffLayout } from "@/lib/comparison/workspace-params";
import { cn } from "@/lib/utils";

const rowTone = { context: "", add: "bg-added-soft", del: "bg-removed-soft" } as const;
const markerText = { context: " ", add: "+", del: "−" } as const;
const markerColor = { context: "text-fg-3", add: "text-added", del: "text-removed" } as const;
const srPrefix = { context: "", add: "Added: ", del: "Removed: " } as const;

const gutter = "w-12 select-none px-2 text-right align-top text-fg-3";
const code = "whitespace-pre px-3 align-top text-fg";

/** Renders structured hunks. Plain monospace; syntax highlighting is not built yet. */
export function DiffViewer({ file, layout }: { file: FileChange; layout: DiffLayout }) {
  if (file.hunks.length === 0) {
    return <EmptyState title="No textual changes" description="This file has no line-level differences to show." />;
  }
  return (
    <table className="min-w-full border-collapse font-mono text-small leading-5">
      <caption className="sr-only">
        {layout === "split" ? "Side-by-side" : "Unified"} diff of {file.path}
      </caption>
      <tbody>
        {file.hunks.map((h, hi) => (
          <Fragment key={`${h.header}-${hi}`}>
            <tr>
              <td colSpan={4} className="border-y border-line bg-raised px-3 py-1 text-fg-3">
                {h.header}
              </td>
            </tr>
            {layout === "split" ? <SplitRows lines={h.lines} /> : <UnifiedRows lines={h.lines} />}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

function UnifiedRows({ lines }: { lines: readonly DiffLine[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <tr key={i} className={rowTone[l.kind]}>
          <td className={gutter}>{l.oldNo ?? ""}</td>
          <td className={gutter}>{l.newNo ?? ""}</td>
          <td aria-hidden className={cn("w-5 select-none text-center align-top", markerColor[l.kind])}>
            {markerText[l.kind]}
          </td>
          <td className={cn(code, "w-full")}>
            <span className="sr-only">{srPrefix[l.kind]}</span>
            {l.text}
          </td>
        </tr>
      ))}
    </>
  );
}

function Cell({ cell, side }: { cell: SplitCell | null; side: "left" | "right" }) {
  const tone = cell ? rowTone[cell.kind] : "bg-raised";
  return (
    <>
      <td className={cn(gutter, tone)}>{cell?.no ?? ""}</td>
      <td className={cn(code, tone, "w-1/2 min-w-[18rem]", side === "left" && "border-r border-line")}>
        {cell && (
          <>
            <span className="sr-only">{srPrefix[cell.kind]}</span>
            {cell.text}
          </>
        )}
      </td>
    </>
  );
}

function SplitRows({ lines }: { lines: readonly DiffLine[] }) {
  return (
    <>
      {toSplitRows(lines).map((r, i) => (
        <tr key={i}>
          <Cell cell={r.left} side="left" />
          <Cell cell={r.right} side="right" />
        </tr>
      ))}
    </>
  );
}

import type { DiffLine, DiffLineKind } from "./types";

export interface SplitCell {
  no: number;
  text: string;
  kind: DiffLineKind;
}
export interface SplitRow {
  left: SplitCell | null;
  right: SplitCell | null;
}

/** Pair a hunk's lines for side-by-side display.
 *  Context lines appear on both sides. A run of changed lines is split into its
 *  removed and added lines, which are paired row by row; the shorter side is padded. */
export function toSplitRows(lines: readonly DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) break;
    if (line.kind === "context") {
      rows.push({
        left: { no: line.oldNo ?? 0, text: line.text, kind: "context" },
        right: { no: line.newNo ?? 0, text: line.text, kind: "context" },
      });
      i++;
      continue;
    }
    const dels: SplitCell[] = [];
    const adds: SplitCell[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l || l.kind === "context") break;
      if (l.kind === "del") dels.push({ no: l.oldNo ?? 0, text: l.text, kind: "del" });
      else adds.push({ no: l.newNo ?? 0, text: l.text, kind: "add" });
      i++;
    }
    const n = Math.max(dels.length, adds.length);
    for (let k = 0; k < n; k++) rows.push({ left: dels[k] ?? null, right: adds[k] ?? null });
  }
  return rows;
}

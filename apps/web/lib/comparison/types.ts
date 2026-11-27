/**
 * Data contract for a comparison. It is shaped like what the FastAPI backend will
 * return from M2/M3, so the UI does not need to change when sample data is replaced.
 */

export type FileStatus = "added" | "modified" | "deleted";
export type DiffLineKind = "context" | "add" | "del";

export interface DiffLine {
  kind: DiffLineKind;
  /** Line number in the old file; null for added lines. */
  oldNo: number | null;
  /** Line number in the new file; null for deleted lines. */
  newNo: number | null;
  text: string;
}

export interface Hunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: readonly DiffLine[];
}

export interface FileChange {
  id: string;
  path: string;
  status: FileStatus;
  language: string;
  additions: number;
  deletions: number;
  hunks: readonly Hunk[];
}

export interface ImageAsset {
  src: string;
  /** Declared size. The UI also reads the real size when the image loads. */
  width: number;
  height: number;
  alt: string;
}

export interface VersionRef {
  label: string;
  description: string;
}

export interface Comparison {
  id: string;
  title: string;
  /** True for fictional fixture data. The UI must always disclose this. */
  isSample: boolean;
  before: VersionRef;
  after: VersionRef;
  screen: { name: string; before: ImageAsset; after: ImageAsset };
  files: readonly FileChange[];
}

"use client";

import { useState } from "react";
import { Download, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import type { Comparison, FileChange } from "@/lib/comparison/types";
import { downloadArtifact, downloadJson } from "@/lib/visual-api";
import type { VisualParams, VisualResult } from "@/lib/visual-types";
import type { LoadedSize, ShotId } from "./image-canvas";
import { STATUS_LABEL, STATUS_TONE } from "./files-list";

export type LoadedSizes = Partial<Record<ShotId, LoadedSize>>;

const fmt = (n: number) => n.toLocaleString("en-US");

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3 last:border-b-0">
      <h3 className="mb-2 text-small font-medium text-fg-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <dl className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-ui text-fg-2">{label}</dt>
      <dd className="min-w-0 text-right text-ui text-fg">{children}</dd>
    </dl>
  );
}

const NotComputed = () => <Badge tone="planned">Not computed</Badge>;

/** Impact is an evidence-graded claim (ADR 0001). With no analysis the only honest grade is Unknown. */
function Impact() {
  return (
    <Section title="Component impact">
      <Row label="Relationship to source">
        <Badge tone="unknown">Unknown</Badge>
      </Row>
      <p className="text-small text-fg-3">Not analysed yet (M6). No link between code and visual changes is claimed.</p>
    </Section>
  );
}

function Versions({ comparison }: { comparison: Comparison }) {
  return (
    <Section title="Versions">
      <Row label="Before (A)">
        <span className="break-all">{comparison.before.label}</span>
      </Row>
      <Row label="After (B)">
        <span className="break-all">{comparison.after.label}</span>
      </Row>
    </Section>
  );
}

function sizeText(s: LoadedSize | undefined) {
  return s ? `${s.width} × ${s.height}` : "Loading…";
}

function RerunForm({ analysis, busy, error, onRerun }: { analysis: VisualResult; busy: boolean; error: string | null; onRerun: (p: VisualParams) => void }) {
  const [tol, setTol] = useState(String(analysis.params.tolerance));
  const n = Number(tol);
  const ok = tol.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 100;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <label htmlFor="rerun-tolerance" className="text-small font-medium text-fg-2">
        Tolerance (ΔE)
      </label>
      <div className="mt-1 flex items-center gap-2">
        <Input id="rerun-tolerance" inputMode="decimal" value={tol} onChange={(e) => setTol(e.target.value)} aria-invalid={!ok} className="w-24" />
        <Button size="sm" disabled={!ok || n === analysis.params.tolerance} loading={busy} onClick={() => onRerun({ ...analysis.params, tolerance: n })}>
          Re-run
        </Button>
      </div>
      <p className="mt-1 text-small text-fg-3">Creates a new comparison from the same two images. The original is kept.</p>
      {error && (
        <p role="alert" className="mt-1 text-small text-removed">
          {error}
        </p>
      )}
    </div>
  );
}

function ExportSection({ analysis }: { analysis: VisualResult }) {
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<void> | void) => async () => {
    setError(null);
    try {
      await fn();
    } catch {
      setError("The download failed. Is the API still running?");
    }
  };
  return (
    <Section title="Export">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={run(() => downloadArtifact(analysis.artifacts.diff_mask, "pixelproof-diff-mask.png"))}>
          <Download className="size-3.5" aria-hidden /> Diff mask (PNG)
        </Button>
        <Button size="sm" onClick={run(() => downloadArtifact(analysis.artifacts.heatmap, "pixelproof-heatmap.png"))}>
          <Download className="size-3.5" aria-hidden /> Heatmap (PNG)
        </Button>
        <Button size="sm" onClick={run(() => downloadJson(analysis, "pixelproof-visual-results.json"))}>
          <Download className="size-3.5" aria-hidden /> Results (JSON)
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-small text-removed">
          {error}
        </p>
      )}
    </Section>
  );
}

function AnalysedVisual({
  comparison,
  analysis,
  rerunBusy,
  rerunError,
  onRerun,
}: {
  comparison: Comparison;
  analysis: VisualResult;
  rerunBusy: boolean;
  rerunError: string | null;
  onRerun: (p: VisualParams) => void;
}) {
  const m = analysis.metrics;
  const { size } = analysis;
  return (
    <>
      <Versions comparison={comparison} />
      <Section title="Screenshots">
        <Row label="Before">
          {analysis.before.width} × {analysis.before.height} · {analysis.before.format}
        </Row>
        <Row label="After">
          {analysis.after.width} × {analysis.after.height} · {analysis.after.format}
        </Row>
        <Row label="Sizes match">
          {size.match ? (
            "Yes"
          ) : (
            <span className="inline-flex flex-col items-end gap-1">
              <Badge tone="removed">No</Badge>
              <span className="text-small text-fg-3">
                {size.policy_applied === "resize"
                  ? "After was resized to match"
                  : `Compared the ${size.overlap.width}×${size.overlap.height} overlap; ${fmt(size.unmatched_pixels)} px in one image only`}
              </span>
            </span>
          )}
        </Row>
      </Section>
      <Section title="Measurements">
        <Row label="Similarity (SSIM)">{m.ssim === null ? <NotComputed /> : <span className="font-mono">{m.ssim.toFixed(4)}</span>}</Row>
        {m.ssim_note && <p className="text-small text-fg-3">{m.ssim_note}</p>}
        <Row label="Changed pixels">
          <span className="font-mono">
            {fmt(m.changed_pixels)} ({m.changed_percent.toFixed(2)}%)
          </span>
        </Row>
        <Row label="Regions">
          <span className="font-mono">{fmt(m.regions_total)}</span>
        </Row>
        <Row label="Mean ΔE (changed)">
          <span className="font-mono">{m.mean_delta_e_changed}</span>
        </Row>
        <Row label="Max ΔE">
          <span className="font-mono">{m.max_delta_e}</span>
        </Row>
        <Row label="Ignored as noise">
          <span className="font-mono">{fmt(m.ignored_small_pixels)} px</span>
        </Row>
        {m.ignored_pixels > 0 && (
          <Row label="Excluded areas">
            <span className="font-mono">{fmt(m.ignored_pixels)} px</span>
          </Row>
        )}
        <p className="text-small text-fg-3">These are observations of pixel difference, not a verdict that anything regressed.</p>
      </Section>
      {analysis.warnings.length > 0 && (
        <Section title="Warnings">
          <ul className="space-y-2">
            {analysis.warnings.map((w) => (
              <li key={w} className="flex gap-2 text-small text-fg-2">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-modified" aria-hidden />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Analysis settings">
        <Row label="Tolerance (ΔE)">{analysis.params.tolerance}</Row>
        <Row label="Minimum region size">{analysis.params.min_area} px</Row>
        <Row label="Merge distance">{analysis.params.merge_distance} px</Row>
        <Row label="Size handling">{analysis.params.size_policy === "pad" ? "Keep sizes" : "Resize after"}</Row>
        <RerunForm key={analysis.id} analysis={analysis} busy={rerunBusy} error={rerunError} onRerun={onRerun} />
      </Section>
      <ExportSection analysis={analysis} />
      <Impact />
    </>
  );
}

export function Inspector({
  lens,
  comparison,
  file,
  loaded,
  rerunBusy,
  rerunError,
  onRerun,
}: {
  lens: "visual" | "code";
  comparison: Comparison;
  file: FileChange | null;
  loaded: LoadedSizes;
  rerunBusy: boolean;
  rerunError: string | null;
  onRerun: (p: VisualParams) => void;
}) {
  if (lens === "code") {
    if (comparison.files.length === 0) {
      return <EmptyState title="No code to inspect" description="This comparison has screenshots only. Importing source code arrives in M3." />;
    }
    if (!file) return <EmptyState title="No file selected" description="Choose a file to see its details." />;
    return (
      <>
        <Section title="File">
          <Row label="Path">
            <code className="break-all font-mono text-small">{file.path}</code>
          </Row>
          <Row label="Status">
            <Badge tone={STATUS_TONE[file.status]}>{STATUS_LABEL[file.status]}</Badge>
          </Row>
          <Row label="Language">{file.language}</Row>
          <Row label="Lines">
            <span className="font-mono">
              <span className="text-added">+{file.additions}</span> <span className="text-removed">−{file.deletions}</span>
            </span>
          </Row>
          <Row label="Hunks">{file.hunks.length}</Row>
        </Section>
        <Versions comparison={comparison} />
        <Impact />
      </>
    );
  }

  if (comparison.analysis) {
    return <AnalysedVisual comparison={comparison} analysis={comparison.analysis} rerunBusy={rerunBusy} rerunError={rerunError} onRerun={onRerun} />;
  }

  const b = loaded.before;
  const a = loaded.after;
  const known = Boolean(b && a);
  const match = b && a ? b.width === a.width && b.height === a.height : false;
  return (
    <>
      <Versions comparison={comparison} />
      <Section title="Screenshots">
        <Row label="Before size">{sizeText(b)}</Row>
        <Row label="After size">{sizeText(a)}</Row>
        <Row label="Sizes match">
          {!known ? (
            "Checking…"
          ) : match ? (
            "Yes"
          ) : (
            <span className="inline-flex flex-col items-end gap-1">
              <Badge tone="removed">No</Badge>
              <span className="text-small text-fg-3">Run an analysis to compare them</span>
            </span>
          )}
        </Row>
      </Section>
      <Section title="Measurements">
        <Row label="Similarity (SSIM)">
          <NotComputed />
        </Row>
        <Row label="Changed pixels">
          <NotComputed />
        </Row>
        <Row label="Changed regions">
          <NotComputed />
        </Row>
        <p className="text-small text-fg-3">Nothing has been measured yet. Run an analysis to see real numbers.</p>
      </Section>
      <Impact />
    </>
  );
}

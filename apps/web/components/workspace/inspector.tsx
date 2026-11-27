import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import type { Comparison, FileChange } from "@/lib/comparison/types";
import type { LoadedSize, ShotId } from "./image-canvas";
import { STATUS_LABEL, STATUS_TONE } from "./files-list";

export type LoadedSizes = Partial<Record<ShotId, LoadedSize>>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3 last:border-b-0">
      <h3 className="mb-2 text-small font-medium text-fg-2">{title}</h3>
      <dl className="space-y-2">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-ui text-fg-2">{label}</dt>
      <dd className="min-w-0 text-right text-ui text-fg">{children}</dd>
    </div>
  );
}

const NotComputed = ({ milestone }: { milestone: string }) => <Badge tone="planned">Not computed · {milestone}</Badge>;

/** Impact is an evidence-graded claim (ADR). With no analysis the only honest grade is Unknown. */
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
      <Row label="Before (A)">{comparison.before.label}</Row>
      <Row label="After (B)">{comparison.after.label}</Row>
    </Section>
  );
}

function sizeText(s: LoadedSize | undefined) {
  return s ? `${s.width} × ${s.height}` : "Loading…";
}

export function Inspector({
  lens,
  comparison,
  file,
  loaded,
}: {
  lens: "visual" | "code";
  comparison: Comparison;
  file: FileChange | null;
  loaded: LoadedSizes;
}) {
  if (lens === "code") {
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
              <span className="text-small text-fg-3">Normalization needed (M2)</span>
            </span>
          )}
        </Row>
      </Section>
      <Section title="Analysis">
        <Row label="Similarity (SSIM)">
          <NotComputed milestone="M2" />
        </Row>
        <Row label="Changed pixels">
          <NotComputed milestone="M2" />
        </Row>
        <Row label="Changed regions">
          <NotComputed milestone="M2" />
        </Row>
      </Section>
      <Impact />
    </>
  );
}


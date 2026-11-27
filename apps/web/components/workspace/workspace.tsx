"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useApiHealth } from "@/components/shell/api-health";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { comparisonFromVisual } from "@/lib/comparison/from-visual";
import type { Comparison } from "@/lib/comparison/types";
import type { DiffLayout, VisualView, Zoom } from "@/lib/comparison/workspace-params";
import { getModule } from "@/lib/modules";
import { VisualApiError, createVisualComparison, getVisualComparison, rerunVisualComparison } from "@/lib/visual-api";
import type { VisualParams, VisualResult } from "@/lib/visual-types";
import { cn } from "@/lib/utils";
import { useComparison, useComparisonControls } from "./comparison-context";
import { DiffViewer } from "./diff-viewer";
import { FilesList, STATUS_LABEL, STATUS_TONE } from "./files-list";
import { ImageCanvas, type LoadedSize, type ShotId } from "./image-canvas";
import { Inspector, type LoadedSizes } from "./inspector";
import { NewComparisonDialog } from "./new-comparison-dialog";
import { SampleBadge } from "./sample-badge";
import { ScreensList } from "./screens-list";
import { useWorkspaceParams } from "./use-workspace-params";

type Lens = "visual" | "code";
type Pane = "list" | "canvas" | "inspector";

const BASE_VIEWS: readonly SegmentedOption<VisualView>[] = [
  { value: "slider", label: "Slider", shortcut: "1" },
  { value: "side-by-side", label: "Side by side", shortcut: "2" },
  { value: "overlay", label: "Overlay", shortcut: "3" },
  { value: "difference", label: "Difference", shortcut: "4" },
  { value: "heatmap", label: "Heatmap", shortcut: "5" },
];
const ZOOM_OPTIONS: readonly SegmentedOption<Zoom>[] = [
  { value: "fit", label: "Fit" },
  { value: "100", label: "100%" },
];
const LAYOUTS: readonly SegmentedOption<DiffLayout>[] = [
  { value: "unified", label: "Unified", shortcut: "1" },
  { value: "split", label: "Split", shortcut: "2" },
];

function isEditable(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

const messageOf = (err: unknown, fallback: string) => (err instanceof VisualApiError ? err.message : fallback);

const paneToggle =
  "hidden h-8 items-center gap-1.5 rounded-control border border-line-strong px-2 text-small text-fg-2 transition-colors duration-150 hover:bg-raised hover:text-fg lg:inline-flex";

export function ComparisonWorkspace({ lens }: { lens: Lens }) {
  const comparison = useComparison();
  const { setComparison, resetToSample } = useComparisonControls();
  const api = useApiHealth();
  const { view, layout, zoom, fileId, cmp, newOpen, update } = useWorkspaceParams(comparison.files);

  const [pane, setPane] = useState<Pane>("canvas");
  const [listOpen, setListOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [opacity, setOpacity] = useState(50);
  const [loaded, setLoaded] = useState<LoadedSizes>({});
  const [showRegions, setShowRegions] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);

  const [loadingCmp, setLoadingCmp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rerunBusy, setRerunBusy] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  // Set while a result we just produced is being written into the URL, so the load effect
  // below does not mistake the not-yet-updated URL for a request to open an older comparison.
  const adopting = useRef<string | null>(null);

  // With the sidebar open, three panes leave the canvas too narrow below ~1440px,
  // so the inspector starts collapsed there. The toggle still opens it.
  useEffect(() => {
    if (window.innerWidth < 1440) setInspectorOpen(false);
  }, []);

  const file = comparison.files.find((f) => f.id === fileId) ?? null;
  const label = getModule(lens).label;
  const fileQuery = fileId ? `?file=${encodeURIComponent(fileId)}` : "";
  const analysis = comparison.analysis;

  const onLoadSize = useCallback((which: ShotId, size: LoadedSize) => {
    setLoaded((prev) => {
      const cur = prev[which];
      return cur && cur.width === size.width && cur.height === size.height ? prev : { ...prev, [which]: size };
    });
  }, []);

  const adopt = useCallback(
    (r: VisualResult, base?: Comparison) => {
      adopting.current = r.id;
      setComparison(comparisonFromVisual(r, base));
      setSelectedRegion(null);
      update({ cmp: r.id, new: null, view: "difference" });
    },
    [setComparison, update],
  );

  // Open the comparison named by ?cmp= (reload, shared link, Overview).
  useEffect(() => {
    if (lens !== "visual") return;
    if (adopting.current) {
      if (cmp === adopting.current) adopting.current = null;
      return;
    }
    if (!cmp || cmp === comparison.id) return;
    let cancelled = false;
    setLoadingCmp(true);
    setLoadError(null);
    getVisualComparison(cmp)
      .then((r) => {
        if (!cancelled) {
          setComparison(comparisonFromVisual(r));
          setSelectedRegion(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(messageOf(err, "Could not load this comparison."));
      })
      .finally(() => {
        if (!cancelled) setLoadingCmp(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lens, cmp, comparison.id, setComparison]);

  // Keep the URL pointing at an analysed comparison so a reload brings it back.
  useEffect(() => {
    if (lens === "visual" && !cmp && analysis && !adopting.current) update({ cmp: comparison.id });
  }, [lens, cmp, analysis, comparison.id, update]);

  // 1-5 switch views (visual) or 1-2 the diff layout (code), unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      const n = Number(e.key);
      if (lens === "visual") {
        const v = BASE_VIEWS[n - 1];
        if (v && (analysis || (v.value !== "difference" && v.value !== "heatmap"))) update({ view: v.value });
      } else {
        const l = LAYOUTS[n - 1];
        if (l) update({ layout: l.value });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lens, analysis, update]);

  const analyzeSample = async () => {
    setSampleBusy(true);
    setActionError(null);
    try {
      const [b, a] = await Promise.all([
        fetch(comparison.screen.before.src).then((r) => r.blob()),
        fetch(comparison.screen.after.src).then((r) => r.blob()),
      ]);
      const r = await createVisualComparison(b, a, { before: "acme-settings-before.png", after: "acme-settings-after.png" });
      adopt(r, comparison);
    } catch (err) {
      setActionError(messageOf(err, "Could not analyse the sample."));
    } finally {
      setSampleBusy(false);
    }
  };

  const rerun = async (p: VisualParams) => {
    if (!analysis) return;
    setRerunBusy(true);
    setRerunError(null);
    try {
      adopt(await rerunVisualComparison(analysis.id, p), comparison.isSample ? comparison : undefined);
    } catch (err) {
      setRerunError(messageOf(err, "Could not re-run the analysis."));
    } finally {
      setRerunBusy(false);
    }
  };

  const viewOptions = BASE_VIEWS.map((o) =>
    !analysis && (o.value === "difference" || o.value === "heatmap") ? { ...o, disabled: true, reason: "Needs an analysis. Use “Analyse sample” or start a new comparison." } : o,
  );
  const apiOnline = api.kind === "online";
  const showPane = (p: Pane) => cn(pane === p ? "flex" : "hidden");
  const noCode = lens === "code" && comparison.files.length === 0;

  return (
    <div className="flex h-full min-h-[32rem] flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <h1 className="text-title font-semibold tracking-tight text-fg">{label}</h1>
        {comparison.isSample && <SampleBadge />}
        <p className="hidden min-w-0 truncate text-small text-fg-2 md:block">
          {comparison.title} · {comparison.before.label} → {comparison.after.label}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <nav aria-label="Comparison lens" className="inline-flex rounded-control border border-line-strong p-0.5">
            {(
              [
                ["visual", "/visual", "Visual"],
                ["code", "/code", "Code"],
              ] as const
            ).map(([id, href, text]) => (
              <Link
                key={id}
                href={`${href}${id === "visual" && cmp ? `?cmp=${cmp}` : fileQuery}`}
                aria-current={lens === id ? "page" : undefined}
                className={cn(
                  "inline-flex h-6 items-center rounded-control px-2.5 text-small transition-colors duration-150",
                  lens === id ? "bg-accent text-accent-fg" : "text-fg-2 hover:bg-raised hover:text-fg",
                )}
              >
                {text}
              </Link>
            ))}
          </nav>
          <button type="button" className={paneToggle} aria-expanded={listOpen} aria-controls="pane-list" onClick={() => setListOpen((o) => !o)}>
            {listOpen ? <PanelLeftClose className="size-3.5" aria-hidden /> : <PanelLeftOpen className="size-3.5" aria-hidden />}
            {listOpen ? "Hide list" : "Show list"}
          </button>
          <button type="button" className={paneToggle} aria-expanded={inspectorOpen} aria-controls="pane-inspector" onClick={() => setInspectorOpen((o) => !o)}>
            {inspectorOpen ? <PanelRightClose className="size-3.5" aria-hidden /> : <PanelRightOpen className="size-3.5" aria-hidden />}
            {inspectorOpen ? "Hide inspector" : "Show inspector"}
          </button>
        </div>
      </header>

      <div role="group" aria-label="Workspace pane" className="flex gap-1 border-b border-line bg-surface p-2 lg:hidden">
        {(
          [
            ["list", lens === "visual" ? "Screens" : "Files"],
            ["canvas", "Canvas"],
            ["inspector", "Inspector"],
          ] as const
        ).map(([p, text]) => (
          <button
            key={p}
            type="button"
            aria-pressed={pane === p}
            onClick={() => setPane(p)}
            className={cn(
              "h-8 flex-1 rounded-control text-ui transition-colors duration-150",
              pane === p ? "bg-accent text-accent-fg" : "text-fg-2 hover:bg-raised hover:text-fg",
            )}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          id="pane-list"
          aria-label={lens === "visual" ? "Screens" : "Changed files"}
          className={cn(showPane("list"), listOpen ? "lg:flex" : "lg:hidden", "w-full shrink-0 flex-col border-r border-line bg-surface lg:w-72")}
        >
          <h2 className="border-b border-line px-3 py-2.5 text-body font-semibold text-fg">{lens === "visual" ? "Screens" : "Changes"}</h2>
          {lens === "visual" ? (
            <ScreensList comparison={comparison} fileQuery={fileQuery} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />
          ) : noCode ? (
            <EmptyState title="No source code" description="This comparison has screenshots only. Importing source code arrives in M3." />
          ) : (
            <FilesList
              files={comparison.files}
              selectedId={fileId}
              onSelect={(id) => {
                update({ file: id });
                setPane("canvas");
              }}
            />
          )}
        </aside>

        <section aria-label="Comparison canvas" className={cn(showPane("canvas"), "lg:flex min-w-0 flex-1 flex-col bg-app")}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2">
            {lens === "visual" ? (
              <>
                <Segmented label="View" value={view} onChange={(v) => update({ view: v })} options={viewOptions} />
                <Segmented label="Zoom" value={zoom} onChange={(z) => update({ zoom: z })} options={ZOOM_OPTIONS} />
                {view === "overlay" && (
                  <label className="inline-flex items-center gap-2 text-small text-fg-2">
                    After opacity
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      aria-valuetext={`${opacity}%`}
                      className="w-32 accent-[var(--accent)]"
                    />
                    <span className="w-9 font-mono text-fg">{opacity}%</span>
                  </label>
                )}
                {analysis && view !== "side-by-side" && (
                  <label className="inline-flex items-center gap-1.5 text-small text-fg-2">
                    <input type="checkbox" checked={showRegions} onChange={(e) => setShowRegions(e.target.checked)} className="accent-[var(--accent)]" />
                    Show regions
                  </label>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {!comparison.isSample && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        resetToSample();
                        update({ cmp: null, view: "slider" });
                      }}
                    >
                      Open sample
                    </Button>
                  )}
                  {comparison.isSample && !analysis && (
                    <Button
                      size="sm"
                      loading={sampleBusy}
                      disabled={!apiOnline}
                      title={apiOnline ? "Run the real analysis on the two fictional sample screenshots" : "The PixelProof API is not reachable"}
                      onClick={() => void analyzeSample()}
                    >
                      Analyse sample
                    </Button>
                  )}
                  <Button size="sm" variant="primary" onClick={() => update({ new: "1" })}>
                    New comparison
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Segmented label="Diff layout" value={layout} onChange={(l) => update({ layout: l })} options={LAYOUTS} />
                {file && (
                  <div className="ml-auto flex min-w-0 items-center gap-2">
                    <code className="truncate font-mono text-small text-fg-2">{file.path}</code>
                    <Badge tone={STATUS_TONE[file.status]}>{STATUS_LABEL[file.status]}</Badge>
                  </div>
                )}
              </>
            )}
          </div>
          {actionError && (
            <p role="alert" className="border-b border-line bg-surface px-4 py-2 text-small text-removed">
              {actionError}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {lens === "visual" ? (
              loadError ? (
                <ErrorState
                  title="Could not open this comparison"
                  description={loadError}
                  action={
                    <Button
                      onClick={() => {
                        setLoadError(null);
                        resetToSample();
                        update({ cmp: null });
                      }}
                    >
                      Open sample
                    </Button>
                  }
                />
              ) : loadingCmp ? (
                <p className="text-small text-fg-3" role="status">
                  Loading comparison…
                </p>
              ) : (
                <ImageCanvas
                  key={comparison.id}
                  view={view}
                  zoom={zoom}
                  before={comparison.screen.before}
                  after={comparison.screen.after}
                  opacity={opacity}
                  onLoadSize={onLoadSize}
                  analysis={analysis}
                  showRegions={showRegions}
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                />
              )
            ) : noCode ? (
              <EmptyState title="No source code in this comparison" description="Importing source code to compare arrives in M3." />
            ) : file ? (
              <div className="overflow-auto rounded-panel border border-line bg-surface">
                <DiffViewer file={file} layout={layout} />
              </div>
            ) : (
              <EmptyState title="No file selected" description="Choose a file from the list to see its changes." />
            )}
          </div>
        </section>

        <aside
          id="pane-inspector"
          aria-label="Inspector"
          className={cn(showPane("inspector"), inspectorOpen ? "lg:flex" : "lg:hidden", "w-full shrink-0 flex-col overflow-y-auto border-l border-line bg-surface lg:w-80")}
        >
          <h2 className="border-b border-line px-4 py-2.5 text-body font-semibold text-fg">Inspector</h2>
          <Inspector lens={lens} comparison={comparison} file={file} loaded={loaded} rerunBusy={rerunBusy} rerunError={rerunError} onRerun={(p) => void rerun(p)} />
        </aside>
      </div>

      {lens === "visual" && (
        <NewComparisonDialog
          open={newOpen}
          onOpenChange={(o) => {
            if (!o) update({ new: null });
          }}
          onDone={(r) => adopt(r)}
        />
      )}
    </div>
  );
}

export function WorkspaceFallback({ lens }: { lens: Lens }) {
  return (
    <div className="px-4 py-3">
      <h1 className="text-title font-semibold tracking-tight text-fg">{getModule(lens).label}</h1>
      <p className="mt-2 text-small text-fg-3">Loading workspace…</p>
    </div>
  );
}

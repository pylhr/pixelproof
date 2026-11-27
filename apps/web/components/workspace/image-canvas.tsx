"use client";

import { useRef, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/states";
import type { ImageAsset } from "@/lib/comparison/types";
import { artifactUrl } from "@/lib/visual-api";
import type { VisualRegion, VisualResult } from "@/lib/visual-types";
import type { VisualView, Zoom } from "@/lib/comparison/workspace-params";
import { cn } from "@/lib/utils";

export type ShotId = "before" | "after";
export interface LoadedSize {
  width: number;
  height: number;
}

interface ShotProps {
  asset: ImageAsset;
  which: ShotId;
  onLoadSize: (which: ShotId, size: LoadedSize) => void;
  onFail: (which: ShotId) => void;
  className?: string;
  style?: React.CSSProperties;
}

function Shot({ asset, which, onLoadSize, onFail, className, style }: ShotProps) {
  const report = (img: HTMLImageElement) => onLoadSize(which, { width: img.naturalWidth, height: img.naturalHeight });
  return (
    // Plain <img>: screenshots must be shown byte-exact, and next/image would re-encode and resize them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0) report(el);
      }}
      src={asset.src}
      alt={asset.alt}
      draggable={false}
      onLoad={(e) => report(e.currentTarget)}
      onError={() => onFail(which)}
      className={cn("block select-none", className)}
      style={style}
    />
  );
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Chip drawn over the image, so it uses fixed contrast rather than theme surfaces. */
function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("pointer-events-none absolute top-2 rounded-control bg-fg/80 px-1.5 text-micro font-medium text-app", className)}>
      {children}
    </span>
  );
}

/** A decorative or derived layer (mask, heatmap) stacked on the canvas. */
function Layer({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // Derived images must be shown pixel-exact too.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} draggable={false} className={cn("pointer-events-none absolute inset-0 size-full select-none", className)} />
  );
}

/** Boxes around changed regions. Drawn in canvas pixel coordinates, so they scale with the image. */
function RegionsOverlay({
  regions,
  width,
  height,
  selected,
  onSelect,
}: {
  regions: VisualRegion[];
  width: number;
  height: number;
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute inset-0 size-full">
      {regions.map((r) => {
        const on = r.id === selected;
        return (
          <rect
            key={r.id}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            vectorEffect="non-scaling-stroke"
            strokeWidth={on ? 3 : 1.5}
            className={cn("pointer-events-auto cursor-pointer stroke-accent", on ? "fill-accent/20" : "fill-transparent")}
            onClick={() => onSelect(on ? null : r.id)}
          />
        );
      })}
    </svg>
  );
}

function HeatmapLegend({ stops }: { stops: VisualResult["heatmap_legend"] }) {
  const gradient = `linear-gradient(to right, ${stops.map((s) => s.color).join(", ")})`;
  return (
    <div className="mx-auto mt-3 max-w-md" aria-label="Heatmap colour scale">
      <div className="h-2.5 rounded-full border border-line" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between font-mono text-micro text-fg-3">
        {stops.map((s, i) => (
          <span key={s.delta_e}>
            {i === stops.length - 1 ? `≥ ${s.delta_e}` : s.delta_e}
          </span>
        ))}
      </div>
      <p className="mt-1 text-center text-small text-fg-3">Colour difference (ΔE) per pixel. Grey: excluded by an ignore area. Empty: present in only one image.</p>
    </div>
  );
}

interface CanvasProps {
  view: VisualView;
  zoom: Zoom;
  before: ImageAsset;
  after: ImageAsset;
  /** After-image opacity for the overlay view, 0-100. */
  opacity: number;
  onLoadSize: (which: ShotId, size: LoadedSize) => void;
  /** Real analysis, when it exists. The difference and heatmap views need it. */
  analysis?: VisualResult;
  showRegions: boolean;
  selectedRegion: number | null;
  onSelectRegion: (id: number | null) => void;
}

export function ImageCanvas({ view, zoom, before, after, opacity, onLoadSize, analysis, showRegions, selectedRegion, onSelectRegion }: CanvasProps) {
  const [failed, setFailed] = useState<ShotId[]>([]);
  const onFail = (which: ShotId) => setFailed((f) => (f.includes(which) ? f : [...f, which]));

  if (failed.length > 0) {
    return (
      <ErrorState
        title="A screenshot could not be loaded"
        description={`Could not load the ${failed.join(" and ")} image. Check that the file exists and reload the page.`}
      />
    );
  }

  const shotProps = { onLoadSize, onFail };
  const frame: React.CSSProperties =
    zoom === "fit"
      ? { width: "100%", maxWidth: before.width, aspectRatio: `${before.width} / ${before.height}` }
      : { width: before.width, flexShrink: 0, aspectRatio: `${before.width} / ${before.height}` };
  const fitImg = zoom === "fit" ? "w-full" : undefined;
  const imgStyle: React.CSSProperties | undefined = zoom === "fit" ? undefined : { width: before.width };

  if (view === "side-by-side") {
    const figs: [ShotId, ImageAsset, string][] = [
      ["before", before, "Before"],
      ["after", after, "After"],
    ];
    return (
      <div className={cn("grid gap-4", zoom === "fit" ? "grid-cols-1 xl:grid-cols-2" : "w-max grid-cols-2")}>
        {figs.map(([which, asset, label]) => (
          <figure key={which} className="min-w-0">
            <figcaption className="mb-1.5 text-small font-medium text-fg-2">{label}</figcaption>
            <div className="overflow-hidden rounded-control border border-line">
              <Shot asset={asset} which={which} {...shotProps} className={fitImg} style={imgStyle} />
            </div>
          </figure>
        ))}
      </div>
    );
  }

  const regionsLayer =
    analysis && showRegions ? (
      <RegionsOverlay regions={analysis.regions} width={before.width} height={before.height} selected={selectedRegion} onSelect={onSelectRegion} />
    ) : null;
  const layered = cn("relative overflow-hidden rounded-control border border-line", zoom === "fit" && "mx-auto");

  if (view === "overlay") {
    return (
      <div className={layered} style={frame}>
        <Shot asset={before} which="before" {...shotProps} className="absolute inset-0 size-full" />
        <Shot
          asset={after}
          which="after"
          {...shotProps}
          className="absolute inset-0 size-full"
          style={{ opacity: opacity / 100 }}
        />
        {regionsLayer}
        <Chip className="left-2">Before</Chip>
        <Chip className="right-2">After · {opacity}%</Chip>
      </div>
    );
  }

  if (view === "difference" || view === "heatmap") {
    if (!analysis) {
      return (
        <EmptyState
          title="This view needs an analysis"
          description="Run an analysis (or start a new comparison) to measure the differences between the two screenshots."
        />
      );
    }
    return (
      <>
        <div className={cn(layered, view === "heatmap" && "bg-raised")} style={frame}>
          {view === "difference" ? (
            <>
              <Shot asset={after} which="after" {...shotProps} className="absolute inset-0 size-full" />
              <Layer src={artifactUrl(analysis.artifacts.diff_mask)} alt="Changed pixels highlighted in red" />
              <Chip className="left-2">After · changed pixels in red</Chip>
            </>
          ) : (
            <>
              <Layer src={artifactUrl(analysis.artifacts.heatmap)} alt="Heatmap of per-pixel colour difference" />
              <Chip className="left-2">Colour difference (ΔE)</Chip>
            </>
          )}
          {regionsLayer}
        </div>
        {view === "heatmap" && <HeatmapLegend stops={analysis.heatmap_legend} />}
      </>
    );
  }

  return <SliderView frame={frame} before={before} after={after} shotProps={shotProps} center={zoom === "fit"} regions={regionsLayer} />;
}

function SliderView({
  frame,
  before,
  after,
  shotProps,
  center,
  regions,
}: {
  frame: React.CSSProperties;
  before: ImageAsset;
  after: ImageAsset;
  shotProps: Pick<ShotProps, "onLoadSize" | "onFail">;
  center: boolean;
  /** Drawn beneath the divider handle; click-through is disabled in this view. */
  regions: React.ReactNode;
}) {
  const [pos, setPos] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = (clientX: number) => {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(clamp(((clientX - r.left) / r.width) * 100));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = pos - step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = pos + step;
    else if (e.key === "PageDown") next = pos - 10;
    else if (e.key === "PageUp") next = pos + 10;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    if (next === null) return;
    e.preventDefault();
    setPos(clamp(next));
  };

  const shown = Math.round(pos);
  return (
    <div
      ref={frameRef}
      className={cn("relative touch-pan-y overflow-hidden rounded-control border border-line", center && "mx-auto")}
      style={frame}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        setFromClientX(e.clientX);
        handleRef.current?.focus({ preventScroll: true });
      }}
      onPointerMove={(e) => {
        if (dragging.current) setFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <Shot asset={before} which="before" {...shotProps} className="absolute inset-0 size-full" />
      <Shot
        asset={after}
        which="after"
        {...shotProps}
        className="absolute inset-0 size-full"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      />
      {regions && <div className="[&_rect]:pointer-events-none">{regions}</div>}
      <Chip className="left-2">Before</Chip>
      <Chip className="right-2">After</Chip>

      <div className="pointer-events-none absolute inset-y-0 w-0" style={{ left: `${pos}%` }}>
        {/* Fixed light line with a dark edge so it reads over any screenshot content. */}
        <div aria-hidden className="absolute inset-y-0 -left-px w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" />
        <div
          ref={handleRef}
          role="slider"
          tabIndex={0}
          aria-label="Before and after divider"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shown}
          aria-valuetext={`${shown}% before, ${100 - shown}% after`}
          onKeyDown={onKeyDown}
          className="pointer-events-auto absolute top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-line-strong bg-surface text-fg shadow-float"
        >
          <ChevronsLeftRight className="size-4" aria-hidden />
        </div>
      </div>
    </div>
  );
}

/** Response of the visual-comparison API (mirrors apps/api/pixelproof/api/schemas.py). */

export type SizePolicy = "pad" | "resize";

export interface VisualBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualParams {
  tolerance: number;
  min_area: number;
  merge_distance: number;
  size_policy: SizePolicy;
  ignore: VisualBox[];
}

export interface VisualImageInfo {
  name: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface VisualRegion extends VisualBox {
  id: number;
  changed_pixels: number;
  mean_delta_e: number;
  max_delta_e: number;
}

export interface VisualResult {
  id: string;
  created_at: string;
  params: VisualParams;
  before: VisualImageInfo;
  after: VisualImageInfo;
  canvas: { width: number; height: number };
  size: {
    match: boolean;
    policy_applied: "none" | "pad" | "resize";
    scaling_applied: boolean;
    overlap: { width: number; height: number };
    unmatched_pixels: number;
    unmatched: (VisualBox & { side: "before" | "after" })[];
  };
  metrics: {
    compared_pixels: number;
    changed_pixels: number;
    changed_percent: number;
    ignored_pixels: number;
    ignored_small_pixels: number;
    ssim: number | null;
    ssim_note: string | null;
    mean_delta_e_changed: number;
    max_delta_e: number;
    regions_total: number;
  };
  regions: VisualRegion[];
  regions_truncated: boolean;
  artifacts: { before: string; after: string; diff_mask: string; heatmap: string };
  heatmap_legend: { delta_e: number; color: string }[];
  warnings: string[];
}

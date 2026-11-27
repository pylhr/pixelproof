import {
  FileText,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Network,
  ScanEye,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type ModuleId = "overview" | "visual" | "code" | "impact" | "timeline" | "reports" | "settings";
export type ModuleStatus = "implemented" | "planned";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  href: string;
  icon: LucideIcon;
  status: ModuleStatus;
  /** Roadmap milestone in which this module becomes functional. */
  milestone: string;
  summary: string;
  capabilities: string[];
}

/** Single source of truth for navigation, the command palette and status panels.
 *  Change `status` only when the module is actually implemented AND verified. */
export const MODULES: readonly ModuleDef[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/overview",
    icon: LayoutDashboard,
    status: "implemented",
    milestone: "M0",
    summary: "Entry point: recent comparisons and system status.",
    capabilities: [],
  },
  {
    id: "visual",
    label: "Visual Evolution",
    href: "/visual",
    icon: ScanEye,
    status: "planned",
    milestone: "M2",
    summary: "Compare two screenshots with real, measured differences.",
    capabilities: [
      "Slider, side-by-side, overlay, difference and heatmap views",
      "SSIM, changed-pixel percentage and changed-region detection",
      "Explicit handling and reporting of size mismatches",
      "Adjustable tolerance and ignore regions for dynamic content",
    ],
  },
  {
    id: "code",
    label: "Code Evolution",
    href: "/code",
    icon: GitCompareArrows,
    status: "planned",
    milestone: "M3",
    summary: "Compare two project versions from ZIP archives or Git commits.",
    capabilities: [
      "Safe ZIP import with path-traversal and size protections",
      "Added, modified and deleted files with line-level diffs",
      "CSS property-level changes and dependency changes",
      "Two-commit comparison for local Git repositories (M4)",
    ],
  },
  {
    id: "impact",
    label: "Component Impact",
    href: "/impact",
    icon: Network,
    status: "planned",
    milestone: "M6",
    summary: "See which changed components can plausibly reach a screen.",
    capabilities: [
      "React component detection and import/render graph (M5)",
      "Evidence-graded links: confirmed, potential or unknown",
      "Every link shows the evidence it is based on",
    ],
  },
  {
    id: "timeline",
    label: "Development Timeline",
    href: "/timeline",
    icon: History,
    status: "planned",
    milestone: "M4",
    summary: "Browse commit history and pick two versions to compare.",
    capabilities: [
      "Commit list for a local repository",
      "Select any two commits to open a comparison",
    ],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: FileText,
    status: "planned",
    milestone: "M6",
    summary: "One exportable report combining visual and code findings.",
    capabilities: [
      "Self-contained HTML and Markdown export",
      "Metrics, regions, changed files, component changes and stated limitations",
    ],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    status: "implemented",
    milestone: "M0",
    summary: "Appearance and connection details.",
    capabilities: [],
  },
] as const;

export function getModule(id: ModuleId): ModuleDef {
  const found = MODULES.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown module: ${id}`);
  return found;
}

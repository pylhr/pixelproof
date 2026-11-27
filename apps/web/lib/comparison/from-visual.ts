import { artifactUrl } from "@/lib/visual-api";
import type { VisualResult } from "@/lib/visual-types";
import type { Comparison } from "./types";

/** Turn an API result into the workspace's Comparison.
 *  With a `base` (the fictional sample) the sample's labels and code changes are kept, and
 *  only the screenshots and analysis come from the result. Uploads have no code changes yet (M3). */
export function comparisonFromVisual(r: VisualResult, base?: Comparison): Comparison {
  const { width, height } = r.canvas;
  const screen = {
    name: r.before.name === r.after.name ? r.before.name : `${r.before.name} vs ${r.after.name}`,
    before: { src: artifactUrl(r.artifacts.before), width, height, alt: `Before: ${r.before.name}` },
    after: { src: artifactUrl(r.artifacts.after), width, height, alt: `After: ${r.after.name}` },
  };
  if (base) return { ...base, id: r.id, screen, analysis: r };
  return {
    id: r.id,
    title: screen.name,
    isSample: false,
    before: { label: r.before.name, description: "Uploaded screenshot" },
    after: { label: r.after.name, description: "Uploaded screenshot" },
    screen,
    files: [],
    analysis: r,
  };
}

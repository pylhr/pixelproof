/** Pure helpers for the workspace's URL state (?view=&layout=&zoom=&file=). */

export const VISUAL_VIEWS = ["slider", "side-by-side", "overlay"] as const;
export type VisualView = (typeof VISUAL_VIEWS)[number];

export const DIFF_LAYOUTS = ["unified", "split"] as const;
export type DiffLayout = (typeof DIFF_LAYOUTS)[number];

export const ZOOMS = ["fit", "100"] as const;
export type Zoom = (typeof ZOOMS)[number];

/** Return `raw` if it is one of `allowed`, otherwise the fallback. URL input is untrusted. */
export function pick<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((a) => a === raw) ?? fallback;
}

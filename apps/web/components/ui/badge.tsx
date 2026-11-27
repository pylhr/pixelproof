import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "planned"
  | "added"
  | "removed"
  | "modified"
  | "confirmed"
  | "potential"
  | "unknown";

/** Evidence grades differ by border style and fill, not colour alone:
 *  confirmed = solid fill, potential = solid outline, unknown = dashed outline. */
const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-raised text-fg-2",
  planned: "border-dashed border-line-strong text-fg-2",
  added: "border-transparent bg-added-soft text-added",
  removed: "border-transparent bg-removed-soft text-removed",
  modified: "border-transparent bg-modified-soft text-modified",
  confirmed: "border-accent bg-accent text-accent-fg",
  potential: "border-accent bg-transparent text-accent",
  unknown: "border-dashed border-line-strong bg-transparent text-fg-2",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-control border px-1.5 text-micro font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

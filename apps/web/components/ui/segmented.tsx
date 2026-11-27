"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Shown as a keyboard hint in the tooltip, e.g. "1". */
  shortcut?: string;
  /** Not selectable right now. Stays visible and focusable so the reason can be found. */
  disabled?: boolean;
  /** Why it is disabled; shown as a tooltip. */
  reason?: string;
}

/** Single-select radio group rendered as a segmented control.
 *  Roving tabindex; arrow keys move and select, as the ARIA radio pattern expects. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    // Skip disabled options.
    for (let step = 1; step <= options.length; step++) {
      const next = (from + delta * step + options.length * step) % options.length;
      const opt = options[next];
      if (opt && !opt.disabled) {
        onChange(opt.value);
        refs.current[next]?.focus();
        return;
      }
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-control border border-line-strong p-0.5", className)}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            aria-disabled={o.disabled || undefined}
            title={o.disabled ? o.reason : o.shortcut ? `${o.label} (${o.shortcut})` : undefined}
            onClick={() => {
              if (!o.disabled) onChange(o.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              "inline-flex h-6 items-center rounded-control px-2.5 text-small transition-colors duration-150",
              selected ? "bg-accent text-accent-fg" : o.disabled ? "cursor-not-allowed text-fg-3" : "text-fg-2 hover:bg-raised hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { GitCompareArrows, Monitor, Moon, Palette, ScanEye, Search, Sun, type LucideIcon } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

type Group = "Navigate" | "Theme" | "Developer";
interface Command {
  id: string;
  group: Group;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useShell();
  const router = useRouter();
  const { setPref } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = MODULES.map((m) => ({
      id: `nav-${m.id}`,
      group: "Navigate",
      label: m.label,
      hint: m.status === "planned" ? `Planned · ${m.milestone}` : m.status === "preview" ? "Preview · sample data" : undefined,
      icon: m.icon,
      run: () => router.push(m.href),
    }));
    const workspace: Command[] = [
      { id: "ws-new", group: "Workspace", label: "New visual comparison", icon: ScanEye, run: () => router.push("/visual?new=1") },
      { id: "ws-diff", group: "Workspace", label: "Visual: difference view", icon: ScanEye, run: () => router.push("/visual?view=difference") },
      { id: "ws-heat", group: "Workspace", label: "Visual: heatmap view", icon: ScanEye, run: () => router.push("/visual?view=heatmap") },
      { id: "ws-slider", group: "Workspace", label: "Visual: slider view", icon: ScanEye, run: () => router.push("/visual?view=slider") },
      { id: "ws-side", group: "Workspace", label: "Visual: side-by-side view", icon: ScanEye, run: () => router.push("/visual?view=side-by-side") },
      { id: "ws-overlay", group: "Workspace", label: "Visual: overlay view", icon: ScanEye, run: () => router.push("/visual?view=overlay") },
      { id: "ws-unified", group: "Workspace", label: "Code: unified diff", icon: GitCompareArrows, run: () => router.push("/code?layout=unified") },
      { id: "ws-split", group: "Workspace", label: "Code: split diff", icon: GitCompareArrows, run: () => router.push("/code?layout=split") },
    ];
    return [
      ...nav,
      ...workspace,
      { id: "theme-light", group: "Theme", label: "Light theme", icon: Sun, run: () => setPref("light") },
      { id: "theme-dark", group: "Theme", label: "Dark theme", icon: Moon, run: () => setPref("dark") },
      { id: "theme-system", group: "Theme", label: "System theme", icon: Monitor, run: () => setPref("system") },
      { id: "dev-ds", group: "Developer", label: "Design system", icon: Palette, run: () => router.push("/design-system") },
    ];
  }, [router, setPref]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));
  const activeId = results[activeIndex]?.id;

  useEffect(() => {
    if (!activeId) return;
    document.getElementById(`cmd-${activeId}`)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const onOpenChange = (open: boolean) => {
    setPaletteOpen(open);
    if (!open) {
      setQuery("");
      setActive(0);
    }
  };

  const runCommand = (c: Command) => {
    onOpenChange(false);
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(results.length ? (activeIndex + 1) % results.length : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(results.length ? (activeIndex - 1 + results.length) % results.length : 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = results[activeIndex];
      if (c) runCommand(c);
    }
  };

  return (
    <Dialog.Root open={paletteOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pp-fade fixed inset-0 z-40 bg-fg/30" />
        <Dialog.Content
          aria-describedby="palette-desc"
          className="pp-pop fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-dialog bg-surface shadow-float"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description id="palette-desc" className="sr-only">
            Type to filter commands. Use the arrow keys to move and Enter to run.
          </Dialog.Description>

          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="size-4 shrink-0 text-fg-3" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded
              aria-controls="palette-list"
              aria-activedescendant={activeId ? `cmd-${activeId}` : undefined}
              aria-label="Search commands"
              placeholder="Search or jump to…"
              className="h-11 w-full bg-transparent text-body text-fg outline-none placeholder:text-fg-3"
            />
          </div>

          <ul id="palette-list" role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-1.5">
            {results.length === 0 && <li className="px-3 py-6 text-center text-ui text-fg-2">No matching commands</li>}
            {results.map((c, i) => {
              const Icon = c.icon;
              const showGroup = i === 0 || results[i - 1]?.group !== c.group;
              return (
                <li key={c.id} role="presentation">
                  {showGroup && <p className="px-2.5 pb-1 pt-2 text-micro font-medium uppercase tracking-wide text-fg-3">{c.group}</p>}
                  <div
                    id={`cmd-${c.id}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseMove={() => setActive(i)}
                    onClick={() => runCommand(c)}
                    className={cn(
                      "flex h-8 cursor-pointer items-center gap-2.5 rounded-control px-2.5 text-ui",
                      i === activeIndex ? "bg-raised text-fg" : "text-fg-2",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{c.label}</span>
                    {c.hint && <span className="ml-auto text-micro text-fg-3">{c.hint}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULES } from "@/lib/modules";
import { useModKey } from "@/lib/platform";
import { BrandMark } from "./brand";
import { useShell } from "./shell-context";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useShell();
  const mod = useModKey();
  // Below the md breakpoint the sidebar is always an icon rail.
  const labelClass = sidebarCollapsed ? "sr-only" : "sr-only md:not-sr-only";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-150 motion-reduce:transition-none",
        sidebarCollapsed ? "w-14" : "w-14 md:w-56",
      )}
    >
      <div className="flex h-12 items-center gap-2 border-b border-line px-4">
        <BrandMark className="size-5 shrink-0 text-accent" />
        <span className={cn("text-body font-semibold tracking-tight text-fg", labelClass)}>PixelProof</span>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {MODULES.map((m) => {
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
          const Icon = m.icon;
          return (
            <Link
              key={m.id}
              href={m.href}
              aria-current={active ? "page" : undefined}
              title={sidebarCollapsed ? m.label : undefined}
              className={cn(
                "group relative flex h-8 items-center gap-2.5 rounded-control px-2.5 text-ui transition-colors duration-150",
                active ? "bg-raised font-medium text-fg" : "text-fg-2 hover:bg-raised hover:text-fg",
              )}
            >
              {active && <span aria-hidden className="absolute inset-y-1.5 -left-2 w-0.5 rounded-full bg-accent" />}
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className={cn("truncate", labelClass)}>{m.label}</span>
              {m.status === "planned" && (
                <span
                  aria-label="Planned"
                  className={cn("ml-auto size-1.5 shrink-0 rounded-full border border-dashed border-line-strong", labelClass === "sr-only" ? "hidden" : "hidden md:block")}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!sidebarCollapsed}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={`${sidebarCollapsed ? "Expand" : "Collapse"} sidebar (${mod}+B)`}
          className="flex h-8 w-full items-center gap-2.5 rounded-control px-2.5 text-ui text-fg-2 transition-colors duration-150 hover:bg-raised hover:text-fg"
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-4 shrink-0" aria-hidden /> : <PanelLeftClose className="size-4 shrink-0" aria-hidden />}
          <span className={cn("truncate", labelClass)}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}

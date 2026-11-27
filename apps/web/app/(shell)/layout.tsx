import { ApiHealthProvider } from "@/components/shell/api-health";
import { CommandPalette } from "@/components/shell/command-palette";
import { ContextBar } from "@/components/shell/context-bar";
import { ShellProvider } from "@/components/shell/shell-context";
import { Sidebar } from "@/components/shell/sidebar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <ApiHealthProvider>
        <a
          href="#main"
          className="sr-only z-50 rounded-control bg-surface px-3 py-2 text-ui text-fg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <ContextBar />
            <main id="main" className="min-h-0 flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <CommandPalette />
      </ApiHealthProvider>
    </ShellProvider>
  );
}

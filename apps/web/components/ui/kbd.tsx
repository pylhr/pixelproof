import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-control border border-line bg-raised px-1 font-mono text-micro text-fg-2",
        className,
      )}
      {...props}
    />
  );
}

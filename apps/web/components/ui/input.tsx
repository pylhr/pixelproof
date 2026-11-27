import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-control border border-line-strong bg-surface px-2.5 text-ui text-fg placeholder:text-fg-3",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-removed",
        className,
      )}
      {...props}
    />
  );
}

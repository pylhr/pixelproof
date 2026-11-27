import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-raised",
  ghost: "text-fg-2 hover:bg-raised hover:text-fg",
};
const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-small",
  md: "h-8 px-3 text-ui",
};

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

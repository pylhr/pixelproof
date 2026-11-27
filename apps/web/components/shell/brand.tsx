export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="4" y="4" width="17" height="17" rx="3.5" stroke="currentColor" strokeWidth="2.5" />
      <rect x="11" y="11" width="17" height="17" rx="3.5" fill="currentColor" />
    </svg>
  );
}

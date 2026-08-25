export function Converting({ count, compact = false }: { count: number; compact?: boolean }) {
  return (
    <div
      className={[
        "anim-rise inline-flex items-center gap-2.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5",
        compact ? "text-xs" : "text-sm",
      ].join(" ")}
    >
      <span className="relative inline-flex h-4 w-4">
        <span className="anim-spin absolute inset-0 rounded-full border-2 border-brand-200 border-t-brand-600" />
      </span>
      <span className="shimmer-text font-semibold">
        Converting {count} iPhone photo{count === 1 ? "" : "s"}
        {compact ? "" : " (HEIC)"}…
      </span>
    </div>
  );
}

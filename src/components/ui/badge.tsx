import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        tone === "neutral" && "bg-[var(--surface-muted)] text-[var(--muted)]",
        tone === "success" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        tone === "warning" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        tone === "danger" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
        tone === "info" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" && "min-h-9 px-3 text-xs",
        size === "md" && "min-h-11 px-4 text-sm",
        size === "lg" && "min-h-13 px-6 text-base",
        variant === "primary" && "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]",
        variant === "secondary" && "border bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
        variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
      {...props}
    />
  );
}

"use client";

import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale, Theme } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

export function ThemeToggle({ locale, theme }: { locale: Locale; theme: Theme }) {
  const pathname = usePathname();
  const dark = theme === "dark";
  const next = dark ? "light" : "dark";
  return (
    <Link
      href={`/api/theme?theme=${next}&return=${encodeURIComponent(pathname)}`}
      className="inline-flex size-11 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
      aria-label={dark ? tx(locale, "تفعيل الوضع الفاتح", "Use light mode") : tx(locale, "تفعيل الوضع الداكن", "Use dark mode")}
      title={dark ? tx(locale, "الوضع الفاتح", "Light mode") : tx(locale, "الوضع الداكن", "Dark mode")}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Link>
  );
}

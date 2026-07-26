"use client";

import { Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const next = locale === "ar" ? "en" : "ar";
  const label = locale === "ar" ? "English" : "العربية";
  return <Link href={`/api/locale?locale=${next}&return=${encodeURIComponent(pathname)}`} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]" aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}>
    <Languages className="size-4" /><span className="hidden sm:inline">{label}</span>
  </Link>;
}

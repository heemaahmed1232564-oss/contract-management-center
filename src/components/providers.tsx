"use client";

import { Toaster } from "sonner";
import type { Locale } from "@/lib/i18n";
import { LocaleProvider } from "@/components/locale-context";

export function Providers({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return (
    <LocaleProvider locale={locale}>
      {children}
      <Toaster richColors position="top-center" dir={locale === "ar" ? "rtl" : "ltr"} />
    </LocaleProvider>
  );
}

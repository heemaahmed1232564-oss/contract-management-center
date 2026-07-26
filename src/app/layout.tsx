import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { getLocale, getTheme } from "@/lib/i18n-server";
import "./globals.css";

// Locale and theme live in cookies, so the document-level lang/dir/class values
// must be resolved for every request instead of being reused from a static shell.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "مركز إدارة التعاقدات | Contract Management Center",
    template: "%s · Contract Management Center",
  },
  description: "منصة ثنائية اللغة لإنشاء وإدارة وتوثيق العقود | A bilingual contract creation, management, and certification platform.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={theme} suppressHydrationWarning>
      <body>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}

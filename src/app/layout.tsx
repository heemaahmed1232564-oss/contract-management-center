import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { getLocale, getTheme } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "مركز إدارة التعاقدات", template: "%s | مركز إدارة التعاقدات" },
  description: "منصة ثنائية اللغة لإنشاء وإدارة وتوثيق العقود.",
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

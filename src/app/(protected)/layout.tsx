import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getLocale, getTheme } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/login");
  }
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return <AppShell user={user} locale={locale} theme={theme}>{children}</AppShell>;
}

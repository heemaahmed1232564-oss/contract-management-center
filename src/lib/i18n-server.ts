import "server-only";
import { cookies } from "next/headers";
import type { Locale, Theme } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("contract_locale")?.value;
  return value === "en" ? "en" : "ar";
}

export async function getTheme(): Promise<Theme> {
  return (await cookies()).get("contract_theme")?.value === "dark" ? "dark" : "light";
}

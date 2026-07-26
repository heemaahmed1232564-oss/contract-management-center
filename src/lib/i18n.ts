export type Locale = "ar" | "en";
export type Theme = "light" | "dark";

export function tx(locale: Locale, ar: string, en: string) {
  return locale === "ar" ? ar : en;
}

export function localeTag(locale: Locale) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

export function localizedName(
  locale: Locale,
  value: { name: string; nameAr?: string | null },
) {
  return locale === "ar" ? value.nameAr?.trim() || value.name : value.name;
}

export function roleLabel(locale: Locale, role: "ADMIN" | "SUPERVISOR" | "CONTRACT_EMPLOYEE") {
  const labels = {
    ADMIN: ["مسؤول النظام", "System Administrator"],
    SUPERVISOR: ["مدير العقود", "Contract Manager"],
    CONTRACT_EMPLOYEE: ["موظف عقود", "Contract Employee"],
  } as const;
  return tx(locale, labels[role][0], labels[role][1]);
}

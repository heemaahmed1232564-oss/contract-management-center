import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";
import { getLocale } from "@/lib/i18n-server";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-5"><ForgotPasswordForm locale={locale} /></main>;
}

import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { getLocale } from "@/lib/i18n-server";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token = "" }, locale] = await Promise.all([searchParams, getLocale()]);
  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-5"><ResetPasswordForm token={token} locale={locale} /></main>;
}

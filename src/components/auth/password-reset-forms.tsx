"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return <AuthCard title={tx(locale, "استعادة كلمة المرور", "Reset your password")} description={tx(locale, "اكتب بريد الحساب وسنرسل تعليمات الاستعادة إذا كان البريد مُعدًا للإرسال.", "Enter your account email and we’ll send reset instructions when email delivery is configured.")} locale={locale}>
    <form onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setMessage("");
      const data = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email") }) });
      const result = await response.json(); setMessage(result.message); setPending(false);
    }} className="space-y-4">
      <label><span className="label">{tx(locale, "البريد الإلكتروني", "Email address")}</span><div className="relative"><Mail className="pointer-events-none absolute end-3 top-3.5 size-4 text-[var(--muted)]" /><input className="field pe-10" name="email" type="email" required dir="ltr" /></div></label>
      {message && <p className="rounded-xl bg-[var(--primary-soft)] p-3 text-sm font-bold text-[var(--primary)]">{message}</p>}
      <Button className="w-full" size="lg" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? tx(locale, "جارٍ الإرسال...", "Sending...") : tx(locale, "إرسال التعليمات", "Send instructions")}</Button>
    </form>
  </AuthCard>;
}

export function ResetPasswordForm({ token, locale }: { token: string; locale: Locale }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  return <AuthCard title={tx(locale, "كلمة مرور جديدة", "Choose a new password")} description={tx(locale, "استخدم 8 أحرف على الأقل، ويفضّل عبارة طويلة يصعب تخمينها.", "Use at least 8 characters. A long, unique passphrase is best.")} locale={locale}>
    <form onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setMessage("");
      const data = new FormData(event.currentTarget);
      if (data.get("password") !== data.get("confirm")) { setMessage(tx(locale, "كلمتا المرور غير متطابقتين.", "Passwords do not match.")); setPending(false); return; }
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: data.get("password") }) });
      const result = await response.json(); setMessage(result.message); setOk(response.ok); setPending(false);
    }} className="space-y-4">
      {!ok && <><label><span className="label">{tx(locale, "كلمة المرور الجديدة", "New password")}</span><input className="field" name="password" type="password" minLength={8} required dir="ltr" /></label><label><span className="label">{tx(locale, "تأكيد كلمة المرور", "Confirm password")}</span><input className="field" name="confirm" type="password" minLength={8} required dir="ltr" /></label></>}
      {message && <p className={`rounded-xl p-3 text-sm font-bold ${ok ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>{message}</p>}
      {ok ? <Link href="/login" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 font-bold text-white">{tx(locale, "العودة لتسجيل الدخول", "Back to sign in")}</Link> : <Button className="w-full" size="lg" disabled={pending || !token}>{pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? tx(locale, "جارٍ الحفظ...", "Saving...") : tx(locale, "حفظ كلمة المرور", "Save password")}</Button>}
    </form>
  </AuthCard>;
}

function AuthCard({ title, description, locale, children }: { title: string; description: string; locale: Locale; children: React.ReactNode }) {
  return <div className="w-full max-w-md rounded-[1.5rem] border bg-[var(--surface)] p-6 shadow-2xl md:p-8"><span className="mb-5 grid size-12 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><ShieldCheck className="size-5" /></span><h1 className="text-2xl font-black">{title}</h1><p className="mb-6 mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>{children}<Link href="/login" className="mt-5 block text-center text-sm font-bold text-[var(--primary)]">{tx(locale, "العودة لتسجيل الدخول", "Back to sign in")}</Link></div>;
}

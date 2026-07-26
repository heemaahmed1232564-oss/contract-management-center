"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

export function LoginForm({ googleEnabled, locale }: { googleEnabled: boolean; locale: Locale }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
    });
    if (result?.error) {
      setError(tx(locale, "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن الحساب معطل.", "The email or password is incorrect, or the account is disabled."));
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-[1.5rem] border bg-[var(--surface)] p-6 shadow-2xl md:p-8">
      <div className="mb-7">
        <p className="mb-2 text-sm font-bold text-[var(--primary)]">{tx(locale, "بوابة فريق العقود", "Contract team portal")}</p>
        <h1 className="text-2xl font-black">{tx(locale, "تسجيل الدخول", "Sign in")}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{tx(locale, "الحسابات المصرح بها فقط يمكنها الوصول إلى القوالب والعقود.", "Only authorized accounts can access templates and contracts.")}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">{tx(locale, "البريد الإلكتروني", "Email address")}</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute end-3 top-3.5 size-4 text-[var(--muted)]" />
            <input className="field pe-10" id="email" name="email" type="email" autoComplete="email" required dir="ltr" />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between"><label className="label mb-0" htmlFor="password">{tx(locale, "كلمة المرور", "Password")}</label><Link href="/forgot-password" className="text-xs font-bold text-[var(--primary)]">{tx(locale, "نسيت كلمة المرور؟", "Forgot password?")}</Link></div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute end-3 top-3.5 size-4 text-[var(--muted)]" />
            <input className="field pe-10" id="password" name="password" type="password" autoComplete="current-password" minLength={8} required dir="ltr" />
          </div>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
        <Button className="w-full" size="lg" type="submit" disabled={pending}>
          {pending && <LoaderCircle className="size-5 animate-spin" />}
          {pending ? tx(locale, "جارٍ التحقق...", "Verifying...") : tx(locale, "دخول آمن", "Secure sign in")}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--border)]" />{tx(locale, "أو", "or")}<span className="h-px flex-1 bg-[var(--border)]" /></div>
          <Button variant="secondary" className="w-full" onClick={() => signIn("google", { redirectTo: "/dashboard" })}>
            {tx(locale, "المتابعة بحساب Google Workspace", "Continue with Google Workspace")}
          </Button>
        </>
      )}
      <p className="mt-6 text-center text-xs text-[var(--muted)]">{tx(locale, "لا تُشارك بيانات الدخول. جميع العمليات الحساسة مسجلة.", "Never share your credentials. Sensitive actions are audited.")}</p>
    </div>
  );
}

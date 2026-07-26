import { FileSignature, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { tx } from "@/lib/i18n";
import { getLocale, getTheme } from "@/lib/i18n-server";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return (
    <main className="relative grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <div className="absolute end-5 top-5 z-20 flex items-center gap-1 rounded-xl border bg-[var(--surface)]/90 p-1 shadow-lg"><LanguageToggle locale={locale} /><ThemeToggle locale={locale} theme={theme} /></div>
      <section className="hidden overflow-hidden bg-[#073d34] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-black"><span className="brand-mark"><FileSignature className="size-6" /></span>{tx(locale, "مركز إدارة التعاقدات", "Contract Management Center")}</div>
        <div className="max-w-xl">
          <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-white/12"><ShieldCheck className="size-7" /></span>
          <h2 className="text-4xl font-black leading-tight">{tx(locale, "القالب الصحيح، في المجلد الصحيح، كل مرة.", "The right template, in the right folder, every time.")}</h2>
          <p className="mt-5 text-lg leading-8 text-emerald-50/80">{tx(locale, "أنشئ العقد ووثّقه بالختم والتوقيع، واحفظ نسخة PDF تلقائيًا.", "Create and certify contracts with a stamp and signature, then save the PDF automatically.")}</p>
        </div>
        <p className="text-sm text-emerald-100/65">{tx(locale, "القوالب الأصلية لا تُعدّل من داخل النظام.", "Original templates are never edited by the system.")}</p>
      </section>
      <section className="flex items-center justify-center p-5 md:p-10">
        <LoginForm locale={locale} googleEnabled={Boolean((process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID) && (process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET))} />
      </section>
    </main>
  );
}

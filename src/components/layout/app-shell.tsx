import { FileSignature, Menu, Sparkles } from "lucide-react";
import type { User } from "@/generated/prisma/client";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppNav } from "@/components/layout/app-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import type { Locale, Theme } from "@/lib/i18n";
import { roleLabel, tx } from "@/lib/i18n";

export function AppShell({ user, children, locale, theme }: { user: User; children: React.ReactNode; locale: Locale; theme: Theme }) {
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <FileSignature className="size-6" />
          </span>
          <div>
            <p className="font-black leading-5">{tx(locale, "مركز إدارة التعاقدات", "Contract Management Center")}</p>
            <p className="mt-1 text-xs text-white/60">{tx(locale, "إنشاء · إدارة · توثيق", "Create · Manage · Certify")}</p>
          </div>
        </div>
        <AppNav role={user.role} locale={locale} />
        <div className="sidebar-user">
          <div className="mb-3 px-3">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-white/55">{roleLabel(locale, user.role)}</p>
          </div>
          <LogoutButton locale={locale} />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="app-topbar">
          <div className="flex min-w-0 items-center gap-3 lg:hidden">
            <details className="relative">
              <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-xl hover:bg-[var(--surface-muted)]" aria-label="فتح القائمة">
                <Menu className="size-5" />
              </summary>
              <div className="absolute right-0 top-13 w-64 rounded-2xl border bg-[var(--surface)] p-3 shadow-2xl">
                <AppNav role={user.role} locale={locale} />
                <div className="mt-3 border-t pt-3"><LogoutButton locale={locale} /></div>
              </div>
            </details>
            <span className="truncate text-sm font-black">{tx(locale, "مركز إدارة التعاقدات", "Contract Management Center")}</span>
          </div>
          <div className="hidden lg:block">
            <p className="flex items-center gap-2 text-sm font-bold"><Sparkles className="size-4 text-[var(--primary)]" />{tx(locale, `مرحبًا، ${user.name}`, `Welcome, ${user.name}`)}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{tx(locale, "أنشئ النسخة الصحيحة ووثّقها من مكان واحد.", "Create the right copy and certify it from one place.")}</p>
          </div>
          <div className="flex items-center gap-1"><LanguageToggle locale={locale} /><ThemeToggle locale={locale} theme={theme} /></div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

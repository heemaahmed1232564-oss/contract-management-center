"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileClock,
  FilePlus2,
  Files,
  LayoutDashboard,
  PackageOpen,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

export function AppNav({ role, locale }: { role: UserRole; locale: Locale }) {
  const pathname = usePathname();
  const baseLinks = [
    { href: "/dashboard", label: tx(locale, "لوحة المتابعة", "Dashboard"), icon: LayoutDashboard },
    { href: "/contracts/new", label: tx(locale, "إنشاء عقد", "Create contract"), icon: FilePlus2 },
    { href: "/contracts", label: tx(locale, "سجل العقود", "Contract registry"), icon: Files },
  ];
  const adminLinks = [
    { href: "/admin", label: tx(locale, "نظرة الإدارة", "Admin overview"), icon: ShieldCheck, adminOnly: false },
    { href: "/admin/templates", label: tx(locale, "القوالب", "Templates"), icon: ScrollText, adminOnly: false },
    { href: "/admin/agencies", label: tx(locale, "الشركات", "Companies"), icon: Building2, adminOnly: true },
    { href: "/admin/packages", label: tx(locale, "الباقات", "Packages"), icon: PackageOpen, adminOnly: true },
    { href: "/admin/users", label: tx(locale, "المستخدمون", "Users"), icon: Users, adminOnly: true },
    { href: "/admin/audit", label: tx(locale, "سجل التدقيق", "Audit log"), icon: FileClock, adminOnly: false },
  ];
  const links =
    role === "CONTRACT_EMPLOYEE"
      ? baseLinks
      : [
          ...baseLinks,
          ...adminLinks.filter((item) => !item.adminOnly || role === "ADMIN"),
        ];
  return (
    <nav aria-label={tx(locale, "التنقل الرئيسي", "Main navigation")} className="space-y-1">
      {links.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition",
              active
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
      <div className="my-3 border-t" />
      <Link
        href="/admin"
        className="hidden min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[var(--muted)]"
      >
        <Settings className="size-4.5" />
        {tx(locale, "الإعدادات", "Settings")}
      </Link>
    </nav>
  );
}

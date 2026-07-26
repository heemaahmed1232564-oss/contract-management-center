import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Cloud,
  Files,
  Link2,
  ScrollText,
  Settings2,
  Unplug,
  Users,
} from "lucide-react";
import { UserRole } from "@/generated/prisma/enums";
import { updateSystemSettingsAction } from "@/actions/admin";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/permissions";
import { contractScope } from "@/lib/auth/scopes";
import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/ui/action-form";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const metadata = { title: "لوحة الإدارة | Admin overview" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string }>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const scope = contractScope(user);
  const [agencies, templates, users, contracts, failed, setting] = await Promise.all([
    prisma.agency.count({ where: { isActive: true } }),
    prisma.contractTemplate.count({ where: { isActive: true, archivedAt: null } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.generatedContract.count({ where: scope }),
    prisma.generatedContract.count({ where: { AND: [scope, { status: "FAILED" }] } }),
    prisma.systemSetting.findUnique({ where: { id: "default" } }),
  ]);
  const stats = [
    { label: tx(locale, "الشركات الفعالة", "Active companies"), value: agencies, icon: Building2 },
    { label: tx(locale, "القوالب الفعالة", "Active templates"), value: templates, icon: ScrollText },
    { label: tx(locale, "المستخدمون الفعالون", "Active users"), value: users, icon: Users },
    { label: tx(locale, "إجمالي العقود المرئية", "Visible contracts"), value: contracts, icon: Files },
  ];
  const driveMode = process.env.GOOGLE_DRIVE_MODE ?? "mock";
  const oauthConfigured = Boolean(
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID && process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET,
  );
  const oauthConnected = Boolean(setting?.googleDriveOAuthRefreshTokenEncrypted);
  const driveLive = driveMode === "service_account" || (driveMode === "oauth" && oauthConnected);
  const driveLabel =
    driveMode === "oauth"
      ? oauthConnected
        ? tx(locale, "Google Drive متصل", "Google Drive connected")
        : tx(locale, "Google Drive غير متصل", "Google Drive disconnected")
      : driveMode === "service_account"
        ? tx(locale, "Google Drive فعلي", "Live Google Drive")
        : tx(locale, "وضع التطوير التجريبي", "Development mock mode");
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-sm font-bold text-[var(--primary)]">{tx(locale, "تحكم وتشغيل", "Control and operations")}</p><h1 className="text-2xl font-black md:text-3xl">{tx(locale, "لوحة الإدارة", "Admin overview")}</h1><p className="mt-2 text-sm text-[var(--muted)]">{tx(locale, "إدارة المصادر ومراقبة رحلة إنشاء وتوثيق العقد.", "Manage sources and monitor contract creation and certification.")}</p></div><Badge tone={driveLive ? "success" : "warning"}>{driveLabel}</Badge></div>
    {query.drive === "connected" && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircle2 className="size-5" /><p className="text-sm font-bold">{tx(locale, "تم ربط Google Drive بنجاح.", "Google Drive connected successfully.")}</p></div>}
    {query.drive === "error" && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"><AlertTriangle className="size-5" /><p className="text-sm font-bold">{tx(locale, "تعذر إكمال ربط Google Drive. تحقق من إعداد OAuth ثم حاول مرة أخرى.", "Could not connect Google Drive. Check the OAuth configuration and try again.")}</p></div>}
    {failed > 0 && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"><AlertTriangle className="size-5" /><p className="text-sm font-bold">{tx(locale, `يوجد ${failed} عقد بحالة فشل ضمن نطاقك.`, `${failed} contracts failed within your scope.`)}</p></div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(s => <article className="card flex items-center gap-4 p-5" key={s.label}><span className="grid size-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><s.icon className="size-5" /></span><div><p className="text-2xl font-black">{s.value}</p><p className="text-xs text-[var(--muted)]">{s.label}</p></div></article>)}</section>
    {user.role === UserRole.ADMIN && driveMode === "oauth" && <section className="card p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><Cloud className="size-5" /></span>
          <div>
            <h2 className="font-black">{tx(locale, "اتصال Google Drive الشخصي", "Personal Google Drive connection")}</h2>
            {oauthConnected
              ? <><p className="mt-1 text-sm text-[var(--muted)]">{tx(locale, "متصل بالحساب", "Connected account")} <span dir="ltr" className="font-bold">{setting?.googleDriveOAuthEmail || "Google Account"}</span></p><p className="mt-1 text-xs text-[var(--muted)]">{tx(locale, "تُنشأ نسخ العقود داخل My Drive وفي مجلد الموظف المحدد.", "Contract copies are created in My Drive inside each employee folder.")}</p></>
              : <p className="mt-1 text-sm text-[var(--muted)]">{tx(locale, "اربط حساب Google المالك لقوالب العقود ومجلدات الموظفين.", "Connect the Google account that owns the templates and employee folders.")}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!oauthConnected && oauthConfigured && <a href="/api/admin/google-drive/connect" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-black text-white hover:opacity-90"><Link2 className="size-4" />{tx(locale, "ربط Google Drive", "Connect Google Drive")}</a>}
          {oauthConnected && <form action="/api/admin/google-drive/disconnect" method="post"><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 text-sm font-black hover:bg-[var(--surface-muted)]"><Unplug className="size-4" />{tx(locale, "فصل الاتصال", "Disconnect")}</button></form>}
        </div>
      </div>
      {!oauthConfigured && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">{tx(locale, "شغّل ملف CONNECT-GOOGLE.bat أولًا لإضافة بيانات Google OAuth بأمان.", "Run CONNECT-GOOGLE.bat first to add Google OAuth credentials securely.")}</div>}
    </section>}
    {user.role === UserRole.ADMIN && <section className="card p-5 md:p-7"><div className="mb-6 flex items-center gap-3"><Settings2 className="size-5 text-[var(--primary)]" /><div><h2 className="font-black">{tx(locale, "إعدادات النظام", "System settings")}</h2><p className="mt-1 text-xs text-[var(--muted)]">{tx(locale, "قواعد الاسم والرقم المرجعي وShared Drive.", "File naming, reference numbering, and Shared Drive settings.")}</p></div></div><ActionForm action={updateSystemSettingsAction} successMessage={tx(locale, "تم حفظ الإعدادات بنجاح.", "Settings saved successfully.")} className="grid gap-5 md:grid-cols-2">
      <label className="md:col-span-2"><span className="label">{tx(locale, "نمط اسم الملف", "File naming pattern")}</span><input className="field" name="namingPattern" defaultValue={setting?.namingPattern} required dir="ltr" /><span className="mt-2 block text-xs text-[var(--muted)]">{tx(locale, "المتغيرات", "Tokens")}: <bdi dir="ltr">{'{reference_number} {agency_code} {package_code} {client_name} {employee_name} {date}'}</bdi></span></label>
      <label><span className="label">{tx(locale, "بادئة الرقم المرجعي", "Reference prefix")}</span><input className="field" name="referencePrefix" defaultValue={setting?.referencePrefix || "CTR"} required dir="ltr" /></label>
      <label><span className="label">Google Drive Root Folder ID</span><input className="field" name="googleDriveRootFolderId" defaultValue={setting?.googleDriveRootFolderId || ""} dir="ltr" /></label>
      <label><span className="label">Shared Drive ID</span><input className="field" name="sharedDriveId" defaultValue={setting?.sharedDriveId || ""} dir="ltr" /></label>
      <div className="md:col-span-2"><SubmitButton label={tx(locale, "حفظ الإعدادات", "Save settings")} /></div>
    </ActionForm></section>}
  </div>;
}

import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleCheck, FilePlus2, Files, Plus } from "lucide-react";
import { ContractStatusBadge } from "@/components/contracts/status-badge";
import { getCurrentUser } from "@/lib/auth/permissions";
import { contractScope } from "@/lib/auth/scopes";
import { prisma } from "@/lib/prisma";
import { formatDateTime, startOfMonth, startOfToday, startOfWeek } from "@/lib/utils";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const metadata = { title: "لوحة المتابعة" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const scope = contractScope(user);
  const [today, week, month, created, recent] = await Promise.all([
    prisma.generatedContract.count({ where: { AND: [scope, { createdAt: { gte: startOfToday() } }] } }),
    prisma.generatedContract.count({ where: { AND: [scope, { createdAt: { gte: startOfWeek() } }] } }),
    prisma.generatedContract.count({ where: { AND: [scope, { createdAt: { gte: startOfMonth() } }] } }),
    prisma.generatedContract.count({ where: { AND: [scope, { status: { in: ["CREATED", "OPENED", "COMPLETED", "PDF_EXPORTED", "CERTIFIED", "SENT"] } }] } }),
    prisma.generatedContract.findMany({
      where: scope,
      include: { agency: true, package: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
  ]);

  const cards = [
    { label: tx(locale, "عقود اليوم", "Contracts today"), value: today, icon: Plus, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    { label: tx(locale, "هذا الأسبوع", "This week"), value: week, icon: CalendarDays, color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    { label: tx(locale, "هذا الشهر", "This month"), value: month, icon: Files, color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
    { label: tx(locale, "نسخ ناجحة", "Successful copies"), value: created, icon: CircleCheck, color: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-bold text-[var(--primary)]">{tx(locale, "ملخص العمل", "Workspace summary")}</p>
          <h1 className="text-2xl font-black md:text-3xl">{tx(locale, "لوحة المتابعة", "Dashboard")}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{tx(locale, "تابع النشاط وافتح آخر النسخ من مكان واحد.", "Track activity and open recent copies from one place.")}</p>
        </div>
        <Link href="/contracts/new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white hover:bg-[var(--primary-strong)]">
          <FilePlus2 className="size-5" />{tx(locale, "إنشاء عقد جديد", "Create new contract")}
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="إحصاءات العقود">
        {cards.map((card) => (
          <article key={card.label} className="card flex items-center gap-4 p-5">
            <span className={`grid size-12 place-items-center rounded-2xl ${card.color}`}><card.icon className="size-5" /></span>
            <div><p className="text-2xl font-black">{card.value}</p><p className="text-sm text-[var(--muted)]">{card.label}</p></div>
          </article>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b p-5">
          <div><h2 className="font-black">{tx(locale, "آخر العقود", "Recent contracts")}</h2><p className="mt-1 text-xs text-[var(--muted)]">{tx(locale, "أحدث النسخ التي يمكنك الوصول إليها.", "The latest copies you can access.")}</p></div>
          <Link href="/contracts" className="flex items-center gap-1 text-sm font-bold text-[var(--primary)]">{tx(locale, "عرض الكل", "View all")}<ArrowLeft className="size-4 rtl:rotate-0 ltr:rotate-180" /></Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-12 text-center"><Files className="mx-auto mb-3 size-10 text-[var(--muted)]" /><p className="font-bold">{tx(locale, "لا توجد عقود بعد", "No contracts yet")}</p><p className="mt-1 text-sm text-[var(--muted)]">{tx(locale, "أنشئ أول نسخة لتظهر هنا.", "Create the first copy to see it here.")}</p></div>
        ) : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>{tx(locale, "المرجع", "Reference")}</th><th>{tx(locale, "الشركة والباقة", "Company & package")}</th><th>{tx(locale, "العميل", "Client")}</th><th>{tx(locale, "الموظف", "Employee")}</th><th>{tx(locale, "الحالة", "Status")}</th><th>{tx(locale, "التاريخ", "Date")}</th><th></th></tr></thead><tbody>
            {recent.map((contract) => <tr key={contract.id}>
              <td className="font-bold" dir="ltr">{contract.referenceNumber}</td>
              <td><p className="font-bold">{contract.agency.nameAr || contract.agency.name}</p><p className="text-xs text-[var(--muted)]">{contract.package.name}</p></td>
              <td>{contract.clientName || "—"}</td><td>{contract.createdBy.name}</td>
              <td><ContractStatusBadge status={contract.status} locale={locale} /></td><td className="whitespace-nowrap text-xs text-[var(--muted)]">{formatDateTime(contract.createdAt)}</td>
              <td>{contract.copiedGoogleFileUrl && <Link className="font-bold text-[var(--primary)]" href={`/api/contracts/${contract.id}/open`} target="_blank">{tx(locale, "فتح", "Open")}</Link>}</td>
            </tr>)}
          </tbody></table></div>
        )}
      </section>
    </div>
  );
}

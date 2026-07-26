import Link from "next/link";
import { Download, ExternalLink, FileSearch, Search } from "lucide-react";
import { ContractStatus } from "@/generated/prisma/enums";
import { updateContractStatusAction } from "@/actions/contracts";
import { contractStatusLabel, ContractStatusBadge } from "@/components/contracts/status-badge";
import { getCurrentUser } from "@/lib/auth/permissions";
import { contractScope } from "@/lib/auth/scopes";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { CertifyContractButton } from "@/components/contracts/certify-contract-button";
import { localizedName, tx } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const metadata = { title: "سجل العقود | Contract registry" };

export default async function ContractsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const scope = contractScope(user);
  const status = Object.values(ContractStatus).includes(params.status as ContractStatus) ? (params.status as ContractStatus) : undefined;
  const dateFrom = params.from ? new Date(`${params.from}T00:00:00`) : undefined;
  const dateTo = params.to ? new Date(`${params.to}T23:59:59`) : undefined;
  const contracts = await prisma.generatedContract.findMany({
    where: {
      AND: [
        scope,
        params.q ? { OR: [
          { referenceNumber: { contains: params.q, mode: "insensitive" } },
          { clientName: { contains: params.q, mode: "insensitive" } },
          { copiedFileName: { contains: params.q, mode: "insensitive" } },
        ] } : {},
        params.agency ? { agencyId: params.agency } : {},
        params.package ? { packageId: params.package } : {},
        status ? { status } : {},
        dateFrom || dateTo ? { createdAt: { gte: dateFrom, lte: dateTo } } : {},
      ],
    },
    include: { agency: true, package: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const [agencies, packages] = await Promise.all([
    prisma.agency.findMany({ where: { generatedContracts: { some: scope } }, orderBy: { name: "asc" } }),
    prisma.package.findMany({ where: { generatedContracts: { some: scope } }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <div><p className="mb-1 text-sm font-bold text-[var(--primary)]">{tx(locale, "قابل للبحث والتتبع", "Searchable and traceable")}</p><h1 className="text-2xl font-black md:text-3xl">{tx(locale, "سجل العقود", "Contract registry")}</h1><p className="mt-2 text-sm text-[var(--muted)]">{tx(locale, "حتى 200 نتيجة من العقود التي تسمح بها صلاحياتك.", "Up to 200 contracts within your permission scope.")}</p></div>
      <form className="card grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-7">
        <label className="relative xl:col-span-2"><span className="sr-only">{tx(locale, "بحث", "Search")}</span><Search className="absolute end-3 top-3.5 size-4 text-[var(--muted)]" /><input name="q" defaultValue={params.q} className="field pe-10" placeholder={tx(locale, "العميل أو الرقم المرجعي", "Client or reference number")} /></label>
        <select className="field" name="agency" defaultValue={params.agency}><option value="">{tx(locale, "كل الشركات", "All companies")}</option>{agencies.map(a => <option key={a.id} value={a.id}>{localizedName(locale, a)}</option>)}</select>
        <select className="field" name="package" defaultValue={params.package}><option value="">{tx(locale, "كل الباقات", "All packages")}</option>{packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className="field" name="status" defaultValue={params.status}><option value="">{tx(locale, "كل الحالات", "All statuses")}</option>{Object.values(ContractStatus).map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select>
        <input className="field" type="date" name="from" defaultValue={params.from} aria-label={tx(locale, "من تاريخ", "From date")} />
        <div className="flex gap-2"><input className="field" type="date" name="to" defaultValue={params.to} aria-label={tx(locale, "إلى تاريخ", "To date")} /><button className="min-w-11 rounded-xl bg-[var(--primary)] text-white" type="submit" aria-label={tx(locale, "تطبيق الفلاتر", "Apply filters")}><Search className="mx-auto size-4" /></button></div>
      </form>
      <section className="card overflow-hidden">
        {contracts.length === 0 ? <div className="p-14 text-center"><FileSearch className="mx-auto mb-3 size-11 text-[var(--muted)]" /><h2 className="font-black">{tx(locale, "لا توجد نتائج مطابقة", "No matching results")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{tx(locale, "غيّر الفلاتر أو أنشئ عقدًا جديدًا.", "Adjust the filters or create a new contract.")}</p></div> :
        <div className="table-wrap"><table className="data-table"><thead><tr><th>{tx(locale, "المرجع", "Reference")}</th><th>{tx(locale, "الشركة", "Company")}</th><th>{tx(locale, "الباقة", "Package")}</th><th>{tx(locale, "العميل", "Client")}</th><th>{tx(locale, "الموظف", "Employee")}</th><th>{tx(locale, "القالب", "Template")}</th><th>{tx(locale, "القيمة", "Value")}</th><th>{tx(locale, "الحالة", "Status")}</th><th>{tx(locale, "الإنشاء", "Created")}</th><th>{tx(locale, "الإجراءات", "Actions")}</th></tr></thead><tbody>{contracts.map(c => <tr key={c.id}>
          <td className="font-bold" dir="ltr">{c.referenceNumber}</td><td>{localizedName(locale, c.agency)}</td><td>{c.package.name}</td><td>{c.clientName || "—"}</td><td>{c.createdBy.name}</td>
          <td><p className="max-w-44 truncate" title={c.originalTemplateName}>{c.originalTemplateName}</p><p className="text-xs text-[var(--muted)]">v{c.originalTemplateVersion}</p></td>
          <td className="whitespace-nowrap">{formatMoney(c.price?.toString() ?? null, c.currency, locale)}</td><td><div className="space-y-2"><ContractStatusBadge status={c.status} locale={locale} />{!['CREATING','FAILED','CERTIFIED'].includes(c.status) && <form action={updateContractStatusAction} className="flex gap-1"><input type="hidden" name="id" value={c.id} /><select name="status" defaultValue={c.status} className="max-w-32 rounded-lg border bg-[var(--surface)] p-1.5 text-xs">{(["OPENED", "COMPLETED", "PDF_EXPORTED", "SENT", "CANCELLED", "ARCHIVED"] as ContractStatus[]).map(option => <option key={option} value={option}>{contractStatusLabel(option, locale)}</option>)}</select><button className="rounded-lg bg-[var(--surface-muted)] px-2.5 text-xs font-bold" type="submit">{tx(locale, "حفظ", "Save")}</button></form>}</div></td><td className="whitespace-nowrap text-xs text-[var(--muted)]">{formatDateTime(c.createdAt, locale)}</td>
          <td><div className="flex min-w-max items-center gap-2">{c.copiedGoogleFileUrl && <Link href={`/api/contracts/${c.id}/open`} target="_blank" title={tx(locale, "فتح النسخة", "Open copy")} className="grid size-9 place-items-center rounded-lg border text-[var(--primary)] hover:bg-[var(--primary-soft)]"><ExternalLink className="size-4" /></Link>}{c.certifiedPdfFileUrl ? <Link href={c.certifiedPdfFileUrl} target="_blank" className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[var(--primary-soft)] px-3 text-xs font-bold text-[var(--primary)]"><Download className="size-4" />PDF</Link> : !['CREATING','FAILED','CANCELLED','ARCHIVED'].includes(c.status) ? <CertifyContractButton id={c.id} locale={locale} /> : null}</div></td>
        </tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}

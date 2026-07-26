import { ContractCreateForm, type TemplateOption } from "@/components/contracts/contract-create-form";
import { getCurrentUser } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { localizedName, tx } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const metadata = { title: "إنشاء عقد | Create contract" };

export default async function NewContractPage() {
  await getCurrentUser();
  const locale = await getLocale();
  const now = new Date();
  const records = await prisma.contractTemplate.findMany({
    where: {
      isActive: true,
      archivedAt: null,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      agency: { isActive: true, archivedAt: null },
      package: { isActive: true, archivedAt: null },
    },
    include: { agency: true, package: true },
    orderBy: [{ agency: { name: "asc" } }, { package: { name: "asc" } }, { version: "desc" }],
  });
  const templates: TemplateOption[] = records.map((record) => ({
    id: record.id,
    agencyId: record.agencyId,
    agencyName: localizedName(locale, record.agency),
    agencyCode: record.agency.code,
    packageId: record.packageId,
    packageName: record.package.name,
    packageCode: record.package.code,
    category: record.package.category,
    contractType: record.contractType,
    duration: record.duration,
    price: record.price ? Number(record.price) : null,
    currency: record.currency,
    offerCode: record.offerCode,
    templateName: record.templateName,
    version: record.version,
    effectiveTo: record.effectiveTo?.toISOString() ?? null,
    updatedAt: record.updatedAt.toISOString(),
  }));
  return (
    <div className="space-y-6">
      <div><p className="mb-1 text-sm font-bold text-[var(--primary)]">{tx(locale, "رحلة سريعة وآمنة", "Fast and secure workflow")}</p><h1 className="text-2xl font-black md:text-3xl">{tx(locale, "إنشاء نسخة عقد", "Create contract copy")}</h1><p className="mt-2 text-sm text-[var(--muted)]">{tx(locale, "اختر من الخيارات المتاحة، وسيحدد النظام ملف القالب من قاعدة البيانات.", "Choose the available options and the system will resolve the matching template.")}</p></div>
      <ContractCreateForm templates={templates} currentTime={now.getTime()} locale={locale} />
    </div>
  );
}

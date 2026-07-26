"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FilePlus2,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

export type TemplateOption = {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyCode: string;
  packageId: string;
  packageName: string;
  packageCode: string;
  category: string;
  contractType: string;
  duration: number | null;
  price: number | null;
  currency: string;
  offerCode: string | null;
  templateName: string;
  version: string;
  effectiveTo: string | null;
  updatedAt: string;
};

type SuccessContract = {
  id: string;
  referenceNumber: string;
  originalTemplateName: string;
  originalTemplateVersion: string;
  copiedFileName: string;
  copiedGoogleFileUrl: string;
  agencyName: string;
  packageName: string;
  employeeName: string;
  status: string;
  createdAt: string;
};

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  return Array.from(new Map(items.map((item) => [key(item), item])).values());
}

export function ContractCreateForm({ templates, currentTime, locale }: { templates: TemplateOption[]; currentTime: number; locale: Locale }) {
  const router = useRouter();
  const [agencyId, setAgencyId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [contractType, setContractType] = useState("");
  const [durationKey, setDurationKey] = useState("");
  const [priceKey, setPriceKey] = useState("");
  const [offerKey, setOfferKey] = useState("");
  const [templateChoice, setTemplateChoice] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<{ key: string; payload: Record<string, unknown>; reference?: string } | null>(null);
  const [success, setSuccess] = useState<SuccessContract | null>(null);

  const agencies = useMemo(() => uniqueBy(templates, (item) => item.agencyId), [templates]);
  const agencyTemplates = templates.filter((item) => item.agencyId === agencyId);
  const packages = uniqueBy(agencyTemplates, (item) => item.packageId);
  const packageTemplates = agencyTemplates.filter((item) => item.packageId === packageId);
  const types = [...new Set(packageTemplates.map((item) => item.contractType))];
  const typeTemplates = packageTemplates.filter((item) => item.contractType === contractType);
  const durations = [...new Set(typeTemplates.map((item) => item.duration === null ? "none" : String(item.duration)))];
  const durationTemplates = typeTemplates.filter((item) => (item.duration === null ? "none" : String(item.duration)) === durationKey);
  const prices = uniqueBy(durationTemplates, (item) => `${item.price ?? "none"}:${item.currency}`);
  const priceTemplates = durationTemplates.filter((item) => `${item.price ?? "none"}:${item.currency}` === priceKey);
  const offers = [...new Set(priceTemplates.map((item) => item.offerCode ?? "none"))];
  const candidates = priceTemplates.filter((item) => (item.offerCode ?? "none") === offerKey);
  const selectedTemplate = candidates.length === 1 ? candidates[0] : candidates.find((item) => item.id === templateChoice);
  const expiresSoon = selectedTemplate?.effectiveTo && new Date(selectedTemplate.effectiveTo).getTime() - currentTime < 30 * 86_400_000;
  const oldTemplate = selectedTemplate && currentTime - new Date(selectedTemplate.updatedAt).getTime() > 180 * 86_400_000;

  function resetAfter(level: "agency" | "package" | "type" | "duration" | "price") {
    if (level === "agency") setPackageId("");
    if (["agency", "package"].includes(level)) setContractType("");
    if (["agency", "package", "type"].includes(level)) setDurationKey("");
    if (["agency", "package", "type", "duration"].includes(level)) setPriceKey("");
    setOfferKey("");
    setTemplateChoice("");
  }

  async function send(payload: Record<string, unknown>, key: string, allowDuplicate = false) {
    setPending(true);
    setError("");
    setDuplicate(null);
    try {
      const response = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey: key, allowDuplicate }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "DUPLICATE_WARNING") {
          setDuplicate({ key, payload, reference: data.details?.referenceNumber });
          return;
        }
        setError(data.message || tx(locale, "تعذر إنشاء العقد.", "Could not create the contract."));
        return;
      }
      setSuccess(data.contract);
      toast.success(tx(locale, "تم إنشاء نسخة العقد بنجاح", "Contract copy created successfully"));
      router.refresh();
    } catch {
      setError(tx(locale, "تعذر الاتصال بالخادم. تحقق من الشبكة ثم حاول مرة أخرى.", "Could not reach the server. Check your connection and try again."));
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTemplate) {
      setError(tx(locale, "أكمل الاختيارات وحدد القالب قبل الإنشاء.", "Complete the selections and choose a template before creating."));
      return;
    }
    const formData = new FormData(event.currentTarget);
    const payload = {
      agencyId: selectedTemplate.agencyId,
      packageId: selectedTemplate.packageId,
      templateId: selectedTemplate.id,
      contractType: selectedTemplate.contractType,
      duration: selectedTemplate.duration,
      price: selectedTemplate.price,
      currency: selectedTemplate.currency,
      offerCode: selectedTemplate.offerCode,
      clientName: formData.get("clientName") || null,
      clientPhone: formData.get("clientPhone") || null,
      clientEmail: formData.get("clientEmail") || null,
      notes: formData.get("notes") || null,
    };
    await send(payload, crypto.randomUUID());
  }

  function reset() {
    setSuccess(null); setAgencyId(""); setPackageId(""); setContractType(""); setDurationKey(""); setPriceKey(""); setOfferKey(""); setTemplateChoice(""); setError("");
  }

  if (success) {
    return (
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[1.5rem] border bg-[var(--surface)] shadow-2xl" aria-live="polite">
        <div className="bg-[var(--primary)] px-6 py-8 text-center text-white md:px-10">
          <span className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-white/15"><CheckCircle2 className="size-9" /></span>
          <h1 className="text-2xl font-black">{tx(locale, "تم إنشاء العقد بنجاح", "Contract created successfully")}</h1>
          <p className="mt-2 text-sm text-emerald-50">{tx(locale, "النسخة الجديدة جاهزة داخل مجلدك، والقالب الأصلي لم يتم تعديله.", "The new copy is ready in your folder and the original template was not changed.")}</p>
        </div>
        <div className="p-6 md:p-8">
          <div className="grid gap-x-8 gap-y-5 rounded-2xl bg-[var(--surface-muted)] p-5 md:grid-cols-2">
            <Info label={tx(locale, "الرقم المرجعي", "Reference number")} value={success.referenceNumber} ltr />
            <Info label={tx(locale, "الشركة", "Company")} value={success.agencyName} />
            <Info label={tx(locale, "الباقة", "Package")} value={success.packageName} />
            <Info label={tx(locale, "الموظف", "Employee")} value={success.employeeName} />
            <Info label={tx(locale, "القالب الأصلي", "Original template")} value={success.originalTemplateName} />
            <Info label={tx(locale, "إصدار القالب", "Template version")} value={`v${success.originalTemplateVersion}`} />
            <Info label={tx(locale, "اسم النسخة الجديدة", "New copy name")} value={success.copiedFileName} wide />
            <Info label={tx(locale, "تاريخ ووقت الإنشاء", "Created at")} value={formatDateTime(success.createdAt)} />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href={`/api/contracts/${success.id}/open`} target="_blank" className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 font-bold text-white hover:bg-[var(--primary-strong)]"><ExternalLink className="size-5" />{tx(locale, "فتح العقد في Google Docs", "Open in Google Docs")}</a>
            <Button size="lg" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(success.copiedGoogleFileUrl); toast.success(tx(locale, "تم نسخ الرابط", "Link copied")); }}><Clipboard className="size-5" />{tx(locale, "نسخ الرابط", "Copy link")}</Button>
            <Button size="lg" variant="ghost" onClick={reset}><RefreshCw className="size-5" />{tx(locale, "إنشاء عقد آخر", "Create another")}</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="card p-5 md:p-7">
        <div className="mb-6 flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><FilePlus2 className="size-5" /></span><div><h2 className="font-black">{tx(locale, "اختيارات العقد", "Contract selections")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{tx(locale, "لن تظهر إلا الاختيارات المرتبطة بقالب فعلي وفعال.", "Only options linked to an active template are shown.")}</p></div></div>
        {templates.length === 0 && <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">{tx(locale, "لا توجد قوالب فعالة حاليًا. تواصل مع المسؤول لإضافة قالب.", "There are no active templates. Ask an administrator to add one.")}</div>}
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={tx(locale, "الشركة", "Company")} required><select className="field" value={agencyId} onChange={(e) => { setAgencyId(e.target.value); resetAfter("agency"); }} required><option value="">{tx(locale, "اختر الشركة", "Choose company")}</option>{agencies.map(item => <option key={item.agencyId} value={item.agencyId}>{item.agencyName} — {item.agencyCode}</option>)}</select></Field>
          <Field label={tx(locale, "الباقة", "Package")} required><select className="field" value={packageId} onChange={(e) => { setPackageId(e.target.value); resetAfter("package"); }} disabled={!agencyId} required><option value="">{tx(locale, "اختر الباقة", "Choose package")}</option>{packages.map(item => <option key={item.packageId} value={item.packageId}>{item.packageName} — {item.category}</option>)}</select></Field>
          <Field label={tx(locale, "نوع العقد", "Contract type")} required><select className="field" value={contractType} onChange={(e) => { setContractType(e.target.value); resetAfter("type"); }} disabled={!packageId} required><option value="">{tx(locale, "اختر النوع", "Choose type")}</option>{types.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
          <Field label={tx(locale, "المدة", "Duration")} required><select className="field" value={durationKey} onChange={(e) => { setDurationKey(e.target.value); resetAfter("duration"); }} disabled={!contractType} required><option value="">{tx(locale, "اختر المدة", "Choose duration")}</option>{durations.map(item => <option key={item} value={item}>{item === "none" ? tx(locale, "بدون مدة محددة", "No fixed duration") : tx(locale, `${item} شهر`, `${item} months`)}</option>)}</select></Field>
          <Field label={tx(locale, "السعر والعملة", "Price and currency")} required><select className="field" value={priceKey} onChange={(e) => { setPriceKey(e.target.value); resetAfter("price"); }} disabled={!durationKey} required><option value="">{tx(locale, "اختر السعر", "Choose price")}</option>{prices.map(item => { const key = `${item.price ?? "none"}:${item.currency}`; return <option key={key} value={key}>{item.price === null ? tx(locale, `بدون سعر — ${item.currency}`, `No price — ${item.currency}`) : formatMoney(item.price, item.currency)}</option>; })}</select></Field>
          <Field label={tx(locale, "العرض", "Offer")} required><select className="field" value={offerKey} onChange={(e) => { setOfferKey(e.target.value); setTemplateChoice(""); }} disabled={!priceKey} required><option value="">{tx(locale, "اختر العرض", "Choose offer")}</option>{offers.map(item => <option key={item} value={item}>{item === "none" ? tx(locale, "بدون عرض", "No offer") : item}</option>)}</select></Field>
          {candidates.length > 1 && <Field label={tx(locale, "القالب المطابق", "Matching template")} required><select className="field" value={templateChoice} onChange={(e) => setTemplateChoice(e.target.value)} required><option value="">{tx(locale, "حدد الإصدار", "Choose version")}</option>{candidates.map(item => <option key={item.id} value={item.id}>{item.templateName} — v{item.version}</option>)}</select></Field>}
        </div>
        <div className="my-7 border-t" />
        <div className="mb-5"><h2 className="font-black">{tx(locale, "بيانات العميل", "Client details")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{tx(locale, "اختيارية وتُستخدم في اسم النسخة والبحث.", "Optional fields used in the copy name and search.")}</p></div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={tx(locale, "اسم العميل", "Client name")}><input className="field" name="clientName" maxLength={160} placeholder={tx(locale, "مثال: أحمد علي", "Example: Ahmed Ali")} /></Field>
          <Field label={tx(locale, "رقم الهاتف", "Phone number")}><input className="field" name="clientPhone" type="tel" maxLength={40} dir="ltr" placeholder="+966..." /></Field>
          <Field label={tx(locale, "البريد الإلكتروني", "Email address")}><input className="field" name="clientEmail" type="email" placeholder="client@example.com" dir="ltr" /></Field>
          <Field label={tx(locale, "ملاحظات", "Notes")}><textarea className="field min-h-24 resize-y" name="notes" maxLength={1000} placeholder={tx(locale, "أي تعليمات داخلية...", "Internal instructions...")} /></Field>
        </div>
        {duplicate && <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-200"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div><p className="font-black">{tx(locale, "يوجد عقد مشابه أُنشئ خلال آخر 15 دقيقة", "A similar contract was created in the last 15 minutes")}{duplicate.reference ? ` (${duplicate.reference})` : ""}.</p><p className="mt-1 text-sm">{tx(locale, "راجع البيانات، أو أكّد أنك تريد إنشاء نسخة إضافية.", "Review the details or confirm that you want another copy.")}</p><div className="mt-3 flex gap-2"><Button type="button" size="sm" onClick={() => send(duplicate.payload, duplicate.key, true)}>{tx(locale, "أنشئ رغم ذلك", "Create anyway")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setDuplicate(null)}>{tx(locale, "تراجع", "Cancel")}</Button></div></div></div></div>}
        {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>}
        <Button className="mt-7 w-full md:w-auto" size="lg" type="submit" disabled={pending || !selectedTemplate}>{pending ? <LoaderCircle className="size-5 animate-spin" /> : <FilePlus2 className="size-5" />}{pending ? tx(locale, "جارٍ إنشاء النسخة...", "Creating copy...") : tx(locale, "إنشاء نسخة العقد", "Create contract copy")}</Button>
      </section>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <section className="card p-5"><div className="mb-4 flex items-center gap-3"><FileText className="size-5 text-[var(--primary)]" /><h2 className="font-black">{tx(locale, "معاينة القالب", "Template preview")}</h2></div>{selectedTemplate ? <div className="space-y-4"><div className="rounded-xl bg-[var(--surface-muted)] p-4"><p className="font-black">{selectedTemplate.templateName}</p><div className="mt-2 flex flex-wrap gap-2"><Badge tone="info">v{selectedTemplate.version}</Badge></div></div><Info label={tx(locale, "آخر تحديث", "Last updated")} value={formatDateTime(selectedTemplate.updatedAt)} /><Info label={tx(locale, "اسم الملف المتوقع", "Expected file name")} value={`CTR-${new Date().getFullYear()}-XXXXXX - ${selectedTemplate.agencyCode} - ${selectedTemplate.packageCode} - ...`} />{(expiresSoon || oldTemplate) && <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300"><AlertTriangle className="size-4 shrink-0" />{expiresSoon ? tx(locale, "هذا القالب على وشك انتهاء سريانه.", "This template expires soon.") : tx(locale, "لم يتم تحديث هذا القالب منذ أكثر من 6 أشهر.", "This template has not been updated for over 6 months.")}</div>}</div> : <div className="py-8 text-center text-sm text-[var(--muted)]"><ArrowRight className="mx-auto mb-3 size-7" />{tx(locale, "أكمل الاختيارات لعرض القالب والإصدار.", "Complete the selections to preview the template and version.")}</div>}</section>
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><div className="flex gap-3"><ShieldCheck className="size-5 shrink-0" /><div><p className="font-black">{tx(locale, "القالب الأصلي محمي", "The original template is protected")}</p><ul className="mt-2 space-y-2 text-xs leading-5"><li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0" />{tx(locale, "سيتم إنشاء File ID جديد.", "A new File ID will be created.")}</li><li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0" />{tx(locale, "ستذهب النسخة إلى مجلدك مباشرةً.", "The copy goes directly to your folder.")}</li><li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0" />{tx(locale, "لن يظهر لك رابط القالب الأصلي.", "The original template link is never exposed.")}</li></ul></div></div></section>
      </aside>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label><span className="label">{label}{required && <span className="mr-1 text-red-600">*</span>}</span>{children}</label>; }
function Info({ label, value, ltr, wide }: { label: string; value: string; ltr?: boolean; wide?: boolean }) { return <div className={wide ? "md:col-span-2" : ""}><p className="mb-1 text-xs font-bold text-[var(--muted)]">{label}</p><p className="break-words text-sm font-bold" dir={ltr ? "ltr" : undefined}>{value}</p></div>; }

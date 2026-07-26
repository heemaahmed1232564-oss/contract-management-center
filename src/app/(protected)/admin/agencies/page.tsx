import { redirect } from "next/navigation";
import { Building2, PenTool, Plus, SlidersHorizontal, Stamp } from "lucide-react";
import { UserRole } from "@/generated/prisma/enums";
import { archiveAgencyAction, saveAgencyAction } from "@/actions/admin";
import { DriveTestButton } from "@/components/admin/drive-test-button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentUser } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/ui/action-form";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { tx, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const metadata = { title: "إدارة الشركات" };

export default async function AgenciesPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (user.role !== UserRole.ADMIN) redirect("/admin");
  const agencies = await prisma.agency.findMany({ include: { _count: { select: { templates: true, generatedContracts: true } } }, orderBy: { name: "asc" } });
  return <div className="space-y-6"><div><p className="mb-1 text-sm font-bold text-[var(--primary)]">{tx(locale, "المصدر الأول للاختيار", "The first selection source")}</p><h1 className="text-2xl font-black">{tx(locale, "إدارة الشركات", "Company management")}</h1></div>
    <details className="card p-5" open><summary className="flex cursor-pointer list-none items-center gap-2 font-black"><Plus className="size-5 text-[var(--primary)]" />{tx(locale, "إضافة شركة", "Add company")}</summary><AgencyForm locale={locale} /></details>
    <section className="space-y-3">{agencies.map(agency => <details className="card p-5" key={agency.id}><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-muted)]"><Building2 className="size-4" /></span><div><p className="font-black">{agency.nameAr || agency.name} <span className="text-xs text-[var(--muted)]" dir="ltr">({agency.code})</span></p><p className="mt-1 text-xs text-[var(--muted)]">{agency._count.templates} {tx(locale, "قالب", "templates")} · {agency._count.generatedContracts} {tx(locale, "عقد", "contracts")}</p></div></div><div className="flex items-center gap-2"><Badge tone={agency.isActive ? "success" : "danger"}>{agency.isActive ? tx(locale, "فعالة", "Active") : tx(locale, "معطلة", "Disabled")}</Badge>{agency.googleDriveFolderId && <DriveTestButton id={agency.googleDriveFolderId} type="folder" />}</div></summary><div className="mt-5 flex justify-end"><ConfirmActionButton action={archiveAgencyAction} id={agency.id} title={tx(locale, "حذف هذه الشركة؟", "Delete this company?")} description={tx(locale, "سيتم إيقافها وإخفاؤها من إنشاء العقود مع الاحتفاظ بالسجلات القديمة.", "It will be disabled and hidden from contract creation while historical records remain.")} successMessage={tx(locale, "تم حذف الشركة.", "Company deleted.")} /></div><AgencyForm agency={agency} locale={locale} /></details>)}</section>
  </div>;
}

type AgencyFormValue = {
  id: string;
  name: string;
  nameAr: string | null;
  code: string;
  googleDriveFolderId: string | null;
  brandingNotes: string | null;
  stampImage: Uint8Array | null;
  signatureImage: Uint8Array | null;
  certificationAlignment: string;
  certificationLayout: string;
  certificationGapAfterTablePt: number;
  certificationHorizontalOffsetPt: number;
  certificationItemGapPt: number;
  certificationSignatureWidthPt: number;
  certificationStampWidthPt: number;
  isActive: boolean;
};

function AgencyForm({ agency, locale }: { agency?: AgencyFormValue; locale: Locale }) {
  const inputFileClass = "field file:me-3 file:rounded-lg file:border-0 file:bg-[var(--primary-soft)] file:px-3 file:py-1 file:font-bold file:text-[var(--primary)]";
  return <ActionForm
    action={saveAgencyAction}
    successMessage={tx(locale, agency ? "تم حفظ الشركة وهوية التوثيق بنجاح." : "تمت إضافة الشركة بنجاح.", agency ? "Company and certification identity saved." : "Company added successfully.")}
    encType="multipart/form-data"
    className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-2"
  >
    {agency && <input type="hidden" name="id" value={agency.id} />}
    <label><span className="label">{tx(locale, "الاسم الإنجليزي", "English name")}</span><input className="field" name="name" defaultValue={agency?.name} required /></label>
    <label><span className="label">{tx(locale, "الاسم العربي", "Arabic name")}</span><input className="field" name="nameAr" defaultValue={agency?.nameAr || ""} dir="rtl" /></label>
    <label><span className="label">{tx(locale, "كود الشركة", "Company code")}</span><input className="field" name="code" defaultValue={agency?.code} required dir="ltr" /></label>
    <label><span className="label">Google Drive Folder ID</span><input className="field" name="googleDriveFolderId" defaultValue={agency?.googleDriveFolderId || ""} dir="ltr" /></label>
    <label className="md:col-span-2"><span className="label">{tx(locale, "ملاحظات الهوية البصرية", "Brand identity notes")}</span><textarea className="field min-h-24" name="brandingNotes" defaultValue={agency?.brandingNotes || ""} /></label>

    <div className="md:col-span-2 mt-2 rounded-2xl border bg-[var(--surface-muted)] p-4 md:p-5">
      <div className="mb-4 flex items-start gap-3">
        <SlidersHorizontal className="mt-0.5 size-5 text-[var(--primary)]" />
        <div><h3 className="font-black">{tx(locale, "ختم وتوقيع الشركة", "Company stamp and signature")}</h3><p className="mt-1 text-xs text-[var(--muted)]">{tx(locale, "هذه الهوية ستُستخدم فقط في عقود هذه الشركة، وتوضع بعد آخر جدول في العقد.", "This identity is used only for this company's contracts and is placed after the last table.")}</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className="label flex items-center gap-2"><Stamp className="size-4" />{tx(locale, "صورة الختم PNG", "Stamp image (PNG)")}</span><input className={inputFileClass} name="stampImage" type="file" accept="image/png" /><span className="mt-2 block text-xs text-[var(--muted)]">{agency?.stampImage ? tx(locale, "يوجد ختم محفوظ؛ اختيار ملف جديد يستبدله.", "A stamp is saved; choosing a new file replaces it.") : tx(locale, "لم يُرفع ختم لهذه الشركة بعد.", "No stamp uploaded for this company yet.")}</span></label>
        <label><span className="label flex items-center gap-2"><PenTool className="size-4" />{tx(locale, "صورة التوقيع PNG", "Signature image (PNG)")}</span><input className={inputFileClass} name="signatureImage" type="file" accept="image/png" /><span className="mt-2 block text-xs text-[var(--muted)]">{agency?.signatureImage ? tx(locale, "يوجد توقيع محفوظ؛ اختيار ملف جديد يستبدله.", "A signature is saved; choosing a new file replaces it.") : tx(locale, "لم يُرفع توقيع لهذه الشركة بعد.", "No signature uploaded for this company yet.")}</span></label>
        <label><span className="label">{tx(locale, "المحاذاة", "Alignment")}</span><select className="field" name="certificationAlignment" defaultValue={agency?.certificationAlignment || "RIGHT"}><option value="RIGHT">{tx(locale, "يمين", "Right")}</option><option value="CENTER">{tx(locale, "منتصف", "Center")}</option><option value="LEFT">{tx(locale, "يسار", "Left")}</option></select></label>
        <label><span className="label">{tx(locale, "ترتيب الصور", "Image layout")}</span><select className="field" name="certificationLayout" defaultValue={agency?.certificationLayout || "SIGNATURE_RIGHT_STAMP_LEFT"}><option value="SIGNATURE_RIGHT_STAMP_LEFT">{tx(locale, "التوقيع يمين — الختم يسار", "Signature right — stamp left")}</option><option value="STAMP_RIGHT_SIGNATURE_LEFT">{tx(locale, "الختم يمين — التوقيع يسار", "Stamp right — signature left")}</option><option value="SIGNATURE_ABOVE_STAMP">{tx(locale, "التوقيع أعلى الختم", "Signature above stamp")}</option><option value="STAMP_ABOVE_SIGNATURE">{tx(locale, "الختم أعلى التوقيع", "Stamp above signature")}</option></select></label>
        <label><span className="label">{tx(locale, "المسافة بعد آخر جدول (pt)", "Gap after last table (pt)")}</span><input className="field" name="certificationGapAfterTablePt" type="number" min="0" max="120" defaultValue={agency?.certificationGapAfterTablePt ?? 12} /></label>
        <label><span className="label">{tx(locale, "الإزاحة عن جانب الصفحة (pt)", "Page side offset (pt)")}</span><input className="field" name="certificationHorizontalOffsetPt" type="number" min="0" max="180" defaultValue={agency?.certificationHorizontalOffsetPt ?? 18} /></label>
        <label><span className="label">{tx(locale, "عرض التوقيع (pt)", "Signature width (pt)")}</span><input className="field" name="certificationSignatureWidthPt" type="number" min="40" max="320" defaultValue={agency?.certificationSignatureWidthPt ?? 150} /></label>
        <label><span className="label">{tx(locale, "عرض الختم (pt)", "Stamp width (pt)")}</span><input className="field" name="certificationStampWidthPt" type="number" min="40" max="320" defaultValue={agency?.certificationStampWidthPt ?? 115} /></label>
        <label><span className="label">{tx(locale, "المسافة بين الختم والتوقيع (pt)", "Gap between images (pt)")}</span><input className="field" name="certificationItemGapPt" type="number" min="0" max="100" defaultValue={agency?.certificationItemGapPt ?? 12} /></label>
      </div>
      <p className="mt-4 text-xs font-bold text-[var(--muted)]">{tx(locale, "إذا لم تكفِ المساحة بعد الجدول، تُضاف صفحة جديدة تلقائيًا حتى لا يغطي الختم أو التوقيع نص العقد.", "If there is not enough room after the table, a new page is added automatically so the identity never covers contract text.")}</p>
    </div>

    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={agency?.isActive ?? true} />{tx(locale, "فعالة", "Active")}</label>
    <div className="md:text-left"><SubmitButton label={tx(locale, "حفظ الشركة والهوية", "Save company and identity")} /></div>
  </ActionForm>;
}

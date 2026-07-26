"use client";

import { useState } from "react";
import { BadgeCheck, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

export function CertifyContractButton({ id, locale }: { id: string; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return <>
    <Button type="button" size="sm" onClick={() => setOpen(true)}><BadgeCheck className="size-4" />{tx(locale, "توثيق", "Certify")}</Button>
    {open && <div className="modal-backdrop" onMouseDown={() => !pending && setOpen(false)}>
      <section className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby={`certify-${id}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label={tx(locale, "إغلاق", "Close")}><X className="size-4" /></button>
        <span className="grid size-13 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]"><BadgeCheck className="size-6" /></span>
        <h2 id={`certify-${id}`} className="mt-4 text-lg font-black">{tx(locale, "توثيق العقد وإصدار PDF؟", "Certify contract and generate PDF?")}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{tx(locale, "سيحدد النظام آخر جدول، ويحوّل مستند Google إلى PDF، ثم يضع ختم وتوقيع الشركة بعد الجدول ويحفظ النسخة داخل مجلد الموظف نفسه.", "The system will find the last table, export the Google Doc to PDF, place the company's stamp and signature after the table, and save it in the same employee folder.")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>{tx(locale, "تراجع", "Cancel")}</Button>
          <Button type="button" disabled={pending} onClick={async () => {
            setPending(true);
            try {
              const response = await fetch(`/api/contracts/${id}/certify`, { method: "POST" });
              const data = await response.json();
              if (!response.ok || !data.ok) throw new Error(data.message || tx(locale, "تعذر التوثيق.", "Certification failed."));
              toast.success(data.message);
              setOpen(false);
              window.location.reload();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : tx(locale, "تعذر التوثيق.", "Certification failed."));
            } finally { setPending(false); }
          }}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}{pending ? tx(locale, "جارٍ التوثيق...", "Certifying...") : tx(locale, "تأكيد التوثيق", "Confirm certification")}</Button>
        </div>
      </section>
    </div>}
  </>;
}

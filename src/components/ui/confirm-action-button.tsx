"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-context";
import { tx } from "@/lib/i18n";

export function ConfirmActionButton({
  action,
  id,
  title,
  description,
  successMessage,
  label,
}: {
  action: (id: string) => Promise<void>;
  id: string;
  title: string;
  description: string;
  successMessage: string;
  label?: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return <>
    <Button type="button" size="sm" variant="danger" onClick={() => setOpen(true)}><Trash2 className="size-4" />{label ?? tx(locale, "حذف", "Delete")}</Button>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={() => !pending && setOpen(false)}>
      <section className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby={`confirm-${id}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label={tx(locale, "إغلاق", "Close")}><X className="size-4" /></button>
        <span className="modal-danger-icon"><Trash2 className="size-6" /></span>
        <h2 id={`confirm-${id}`} className="mt-4 text-lg font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>{tx(locale, "تراجع", "Cancel")}</Button>
          <Button type="button" variant="danger" disabled={pending} onClick={() => startTransition(async () => {
            try {
              await action(id);
              toast.success(successMessage);
              setOpen(false);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : tx(locale, "تعذر إتمام العملية.", "The action could not be completed."));
            }
          })}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}{tx(locale, "تأكيد الحذف", "Confirm deletion")}</Button>
        </div>
      </section>
    </div>}
  </>;
}

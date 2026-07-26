"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-context";
import { tx } from "@/lib/i18n";

type State = { sequence: number; ok?: boolean; message?: string };

export function ActionForm({
  action,
  successMessage,
  className,
  children,
  encType,
}: {
  action: (formData: FormData) => Promise<void>;
  successMessage: string;
  className?: string;
  children: React.ReactNode;
  encType?: "multipart/form-data";
}) {
  const locale = useLocale();
  const [state, formAction] = useActionState(async (previous: State, formData: FormData) => {
    try {
      await action(formData);
      return { sequence: previous.sequence + 1, ok: true, message: successMessage };
    } catch (error) {
      return {
        sequence: previous.sequence + 1,
        ok: false,
        message: error instanceof Error ? error.message : tx(locale, "تعذر إتمام العملية.", "The action could not be completed."),
      };
    }
  }, { sequence: 0, ok: false, message: "" });

  useEffect(() => {
    if (!state.sequence) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return <form action={formAction} className={className} encType={encType}>{children}</form>;
}

"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-context";
import { tx } from "@/lib/i18n";

export function SubmitButton({ label = "حفظ" }: { label?: string }) {
  const { pending } = useFormStatus();
  const locale = useLocale();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
      {pending ? tx(locale, "جارٍ الحفظ...", "Saving...") : label}
    </Button>
  );
}

"use client";

import { useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-context";
import { tx } from "@/lib/i18n";

export function ResetLinkButton({ userId }: { userId: string }) {
  const [pending, setPending] = useState(false);
  const locale = useLocale();
  return <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={async () => {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-link`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || tx(locale, "تعذر إنشاء الرابط.", "Could not create link."));
      await navigator.clipboard.writeText(data.url);
      toast.success(tx(locale, "تم إنشاء رابط صالح لمدة 30 دقيقة ونسخه.", "A 30-minute reset link was created and copied."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx(locale, "تعذر إنشاء الرابط.", "Could not create link."));
    } finally { setPending(false); }
  }}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}{tx(locale, "رابط استعادة", "Reset link")}</Button>;
}

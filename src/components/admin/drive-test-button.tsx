"use client";

import { useState } from "react";
import { CopyCheck, ExternalLink, LoaderCircle, PlugZap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-context";
import { tx } from "@/lib/i18n";

export function DriveTestButton({ id, type = "file", templateId }: { id: string; type?: "file" | "folder"; templateId?: string }) {
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  return (
    <Button type="button" size="sm" variant="secondary" disabled={pending || !id} onClick={async () => {
      setPending(true);
      try {
        const response = await fetch("/api/admin/drive/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, type, templateId }) });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.message || tx(locale, "فشل الاختبار", "Test failed"));
        toast.success(type === "folder" ? tx(locale, "المجلد متاح ويمكن إضافة الملفات", "Folder is accessible and writable") : tx(locale, "القالب متاح ويمكن نسخه", "Template is accessible and copyable"));
      } catch (error) { toast.error(error instanceof Error ? error.message : tx(locale, "تعذر اختبار الاتصال", "Could not test access")); }
      finally { setPending(false); }
    }}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <PlugZap className="size-4" />}{tx(locale, "اختبار الوصول", "Test access")}
    </Button>
  );
}

export function TestCopyButton({ templateId }: { templateId: string }) {
  const [pending, setPending] = useState(false);
  const locale = useLocale();
  return <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={async () => {
    setPending(true);
    try {
      const response = await fetch("/api/admin/drive/test-copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || tx(locale, "فشل إنشاء النسخة التجريبية", "Test copy failed"));
      toast.success(tx(locale, "تم إنشاء نسخة تجريبية داخل مجلد المسؤول", "Test copy created in the administrator folder"));
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) { toast.error(error instanceof Error ? error.message : tx(locale, "تعذر إنشاء النسخة التجريبية", "Could not create test copy")); }
    finally { setPending(false); }
  }}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <CopyCheck className="size-4" />}{tx(locale, "نسخة تجريبية", "Test copy")}<ExternalLink className="size-3" /></Button>;
}

import type { ContractStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

const labels: Record<ContractStatus, [string, string]> = {
  CREATING: ["جارٍ الإنشاء", "Creating"],
  CREATED: ["تم الإنشاء", "Created"],
  OPENED: ["تم الفتح", "Opened"],
  COMPLETED: ["مكتمل", "Completed"],
  PDF_EXPORTED: ["PDF مصدّر", "PDF exported"],
  CERTIFIED: ["موثّق", "Certified"],
  SENT: ["تم الإرسال", "Sent"],
  FAILED: ["فشل", "Failed"],
  CANCELLED: ["ملغي", "Cancelled"],
  ARCHIVED: ["مؤرشف", "Archived"],
};

export function ContractStatusBadge({ status, locale = "ar" }: { status: ContractStatus; locale?: Locale }) {
  const tone =
    status === "FAILED" || status === "CANCELLED"
      ? "danger"
      : status === "CREATING"
        ? "warning"
        : status === "CREATED" || status === "OPENED" || status === "COMPLETED" || status === "CERTIFIED" || status === "SENT"
          ? "success"
          : "neutral";
  return <Badge tone={tone}>{tx(locale, labels[status][0], labels[status][1])}</Badge>;
}

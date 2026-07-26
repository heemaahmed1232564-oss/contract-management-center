import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { logger } from "@/lib/logger";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const locale = await getLocale();
  try {
    const { email } = schema.parse(await request.json());
    await requestPasswordReset(email);
  } catch (error) {
    logger.warn({ error }, "Password reset request could not be delivered");
  }
  return NextResponse.json({
    ok: true,
    message: tx(
      locale,
      "إذا كان الحساب موجودًا، ستصلك تعليمات إعادة التعيين. ويمكن للمسؤول إنشاء رابط من صفحة المستخدمين.",
      "If the account exists, reset instructions will be sent. An administrator can also create a reset link from the Users page.",
    ),
  });
}

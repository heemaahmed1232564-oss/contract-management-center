import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { logger } from "@/lib/logger";

const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json());
    await requestPasswordReset(email);
  } catch (error) {
    logger.warn({ error }, "Password reset request could not be delivered");
  }
  return NextResponse.json({
    ok: true,
    message: "إذا كان الحساب موجودًا، ستصلك تعليمات إعادة التعيين. ويمكن للمسؤول إنشاء رابط من صفحة المستخدمين.",
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, userMessage } from "@/lib/api-error";
import { resetPassword } from "@/lib/auth/password-reset";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  const locale = await getLocale();
  try {
    const data = schema.parse(await request.json());
    await resetPassword(data.token, data.password);
    return NextResponse.json({ ok: true, message: tx(locale, "تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.", "Password changed. You can sign in now.") });
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return NextResponse.json(
      { ok: false, message: userMessage(error, locale) },
      { status: appError?.status ?? 422 },
    );
  }
}

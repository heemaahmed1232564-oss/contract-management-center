import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, userMessage } from "@/lib/api-error";
import { resetPassword } from "@/lib/auth/password-reset";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  try {
    const data = schema.parse(await request.json());
    await resetPassword(data.token, data.password);
    return NextResponse.json({ ok: true, message: "تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن." });
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return NextResponse.json(
      { ok: false, message: userMessage(error) },
      { status: appError?.status ?? 422 },
    );
  }
}

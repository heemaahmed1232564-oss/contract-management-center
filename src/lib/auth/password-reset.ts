import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { hash } from "bcryptjs";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

const RESET_MINUTES = 30;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appUrl() {
  return (process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function createPasswordResetLink(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_MINUTES * 60_000);
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: tokenHash(token), expiresAt },
    }),
  ]);
  return { url: `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`, expiresAt };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user?.isActive) return;
  const reset = await createPasswordResetLink(user.id);
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: "إعادة تعيين كلمة المرور | Contract Management Center",
    text: `استخدم الرابط التالي خلال ${RESET_MINUTES} دقيقة لإعادة تعيين كلمة المرور:\n${reset.url}`,
    html: `<p>استخدم الرابط التالي خلال ${RESET_MINUTES} دقيقة لإعادة تعيين كلمة المرور:</p><p><a href="${reset.url}">${reset.url}</a></p>`,
  });
}

export async function resetPassword(token: string, password: string) {
  if (password.length < 8) throw new AppError("WEAK_PASSWORD", "كلمة المرور يجب أن تكون 8 أحرف على الأقل.", 422);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: tokenHash(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError("RESET_TOKEN_INVALID", "رابط إعادة التعيين غير صالح أو انتهت مدته.", 422);
  }
  const passwordHash = await hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 }, isActive: true },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        userId: record.userId,
        action: "PASSWORD_RESET_COMPLETED",
        entityType: "User",
        entityId: record.userId,
      },
    }),
  ]);
}

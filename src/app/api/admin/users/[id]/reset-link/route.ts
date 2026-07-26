import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/permissions";
import { createPasswordResetLink } from "@/lib/auth/password-reset";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireRole([UserRole.ADMIN]);
  const { id } = await context.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) return NextResponse.json({ ok: false, message: "المستخدم غير موجود." }, { status: 404 });
  const reset = await createPasswordResetLink(user.id);
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "PASSWORD_RESET_LINK_CREATED",
      entityType: "User",
      entityId: user.id,
      details: { email: user.email, expiresAt: reset.expiresAt.toISOString() },
    },
  });
  return NextResponse.json({ ok: true, url: reset.url, expiresAt: reset.expiresAt });
}

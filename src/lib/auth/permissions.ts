import { auth } from "@/auth";
import { UserRole } from "@/generated/prisma/enums";
import { AppError, errorMessages } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || session.user.isActive === false) throw new AppError("UNAUTHORIZED", errorMessages.UNAUTHORIZED, 401);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("UNAUTHORIZED", errorMessages.UNAUTHORIZED, 401);
  if (!user.isActive) throw new AppError("USER_DISABLED", errorMessages.USER_DISABLED, 403);
  if (session.user.sessionVersion !== user.sessionVersion) {
    throw new AppError("SESSION_REVOKED", errorMessages.UNAUTHORIZED, 401);
  }
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) {
    throw new AppError("FORBIDDEN", errorMessages.FORBIDDEN, 403);
  }
  return user;
}

export function canSeeAllContracts(role: UserRole) {
  return role === UserRole.ADMIN;
}

export function canManageTemplates(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.SUPERVISOR;
}

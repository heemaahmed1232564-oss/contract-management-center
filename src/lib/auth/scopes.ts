import type { Prisma, User } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";

export function contractScope(user: User): Prisma.GeneratedContractWhereInput {
  if (user.role === UserRole.ADMIN) return {};
  if (user.role === UserRole.SUPERVISOR) {
    return {
      OR: [{ createdById: user.id }, { createdBy: { managerId: user.id } }],
    };
  }
  return { createdById: user.id };
}

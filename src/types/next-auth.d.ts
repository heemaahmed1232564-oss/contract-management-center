import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: UserRole;
      isActive: boolean;
      sessionVersion: number;
    };
  }

  interface User {
    role?: UserRole;
    isActive?: boolean;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    isActive?: boolean;
    sessionVersion?: number;
  }
}

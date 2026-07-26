import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!(user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR)) redirect("/dashboard");
  return children;
}

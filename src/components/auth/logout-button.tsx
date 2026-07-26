import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import type { Locale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

export function LogoutButton({ locale = "ar" }: { locale?: Locale }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
      >
        <LogOut className="size-4" />
        {tx(locale, "تسجيل الخروج", "Sign out")}
      </button>
    </form>
  );
}

import { KeyRound, LogOut } from "lucide-react";
import type { MembershipRole } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/sidebar";
import { formatEnumLabel } from "@/lib/format";

export function Topbar({
  organizationName,
  userDisplayName,
  userEmail,
  role,
}: {
  organizationName: string;
  userDisplayName: string;
  userEmail: string;
  role: MembershipRole;
}) {
  return (
    <header className="border-b border-[#d9dee8] bg-white px-5 py-4 shadow-sm sm:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#4c6f68]">{organizationName}</p>
          <p className="mt-1 text-sm text-[#5c6470]">
            {userDisplayName} · {userEmail} · {formatEnumLabel(role)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button href="/developer/api-keys" variant="secondary">
            <KeyRound className="h-4 w-4" aria-hidden />
            API Keys
          </Button>
          <form action="/logout" method="post">
            <Button type="submit">
              <LogOut className="h-4 w-4" aria-hidden />
              Logout
            </Button>
          </form>
        </div>
      </div>

      <MobileNav />
    </header>
  );
}

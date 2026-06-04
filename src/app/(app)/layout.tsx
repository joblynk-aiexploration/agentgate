import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireMembership } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const membership = await requireMembership();

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] text-[#16181d]">
      <Sidebar
        organizationName={membership.organization.name}
        role={membership.role}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          organizationName={membership.organization.name}
          role={membership.role}
          userDisplayName={membership.user.name ?? membership.user.email}
          userEmail={membership.user.email}
        />

        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

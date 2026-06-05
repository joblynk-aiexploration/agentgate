import { Activity, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePlatformOwner } from "@/lib/platform";
import { prisma } from "@/lib/prisma";

type CountCardProps = {
  label: string;
  value: number | string;
};

function CountCard({ label, value }: CountCardProps) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-[#5c6470]">{label}</p>
        <p className="mt-3 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function PlatformHealthPage() {
  const membership = await requirePlatformOwner();
  let databaseStatus: "connected" | "unavailable" = "connected";
  let counts = {
    actions: 0,
    agents: 0,
    approvals: 0,
    auditLogs: 0,
    organizations: 0,
    users: 0,
  };

  try {
    const [
      organizations,
      users,
      agents,
      actions,
      approvals,
      auditLogs,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.agent.count(),
      prisma.actionRequest.count(),
      prisma.approvalRequest.count(),
      prisma.auditLog.count(),
    ]);

    counts = {
      actions,
      agents,
      approvals,
      auditLogs,
      organizations,
      users,
    };
  } catch {
    databaseStatus = "unavailable";
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/platform" variant="secondary">
            Back to platform
          </Button>
        }
        description="Read-only health snapshot for the local demo platform."
        eyebrow={membership.organization.slug}
        title="Platform Health"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#5c6470]">App status</p>
              <p className="mt-3 font-semibold">AgentGate is responding</p>
            </div>
            <Activity className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#5c6470]">Database status</p>
              <div className="mt-3">
                <StatusBadge status={databaseStatus} />
              </div>
            </div>
            <Database className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CountCard label="Organizations" value={counts.organizations} />
        <CountCard label="Users" value={counts.users} />
        <CountCard label="Agents" value={counts.agents} />
        <CountCard label="Actions" value={counts.actions} />
        <CountCard label="Approvals" value={counts.approvals} />
        <CountCard label="Audit logs" value={counts.auditLogs} />
      </div>

      {databaseStatus === "unavailable" ? (
        <Card className="border-[#e6c6b7]">
          <CardContent className="text-sm leading-6 text-[#9d3f1f]">
            Database health could not be read. Check `DATABASE_URL`, migrations,
            and local Postgres availability.
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

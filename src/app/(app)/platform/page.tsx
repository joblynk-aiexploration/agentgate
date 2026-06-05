import {
  Activity,
  Building2,
  FileClock,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePlatformOwner } from "@/lib/platform";
import { prisma } from "@/lib/prisma";

export default async function PlatformPage() {
  const membership = await requirePlatformOwner();
  const [organizationCount, userCount, actionCount, auditLogCount] =
    await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.actionRequest.count(),
      prisma.auditLog.count(),
    ]);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Read-only platform owner controls for reviewing tenants, platform audit activity, and demo health."
        eyebrow={membership.organization.slug}
        title="Platform Admin"
      />

      <Card>
        <CardContent className="flex items-start gap-3 text-sm leading-6 text-[#34404a]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2d6f7f]" aria-hidden />
          <p>
            Platform owner access is restricted server-side. These V1 pages are
            intentionally lightweight and do not expose secrets or add platform
            mutation controls.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Organizations</p>
            <p className="mt-3 text-2xl font-semibold">{organizationCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Users</p>
            <p className="mt-3 text-2xl font-semibold">{userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Actions</p>
            <p className="mt-3 text-2xl font-semibold">{actionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Audit logs</p>
            <p className="mt-3 text-2xl font-semibold">{auditLogCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6 text-[#34404a]">
            <p>Review tenant status, plans, kill switches, and object counts.</p>
            <Button href="/platform/organizations" variant="secondary">
              <Building2 className="h-4 w-4" aria-hidden />
              View organizations
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Platform audit</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6 text-[#34404a]">
            <p>Inspect audit logs across organizations with safe metadata summaries.</p>
            <Button href="/platform/audit" variant="secondary">
              <FileClock className="h-4 w-4" aria-hidden />
              View audit
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6 text-[#34404a]">
            <p>Check database status and high-level platform object counts.</p>
            <Button href="/platform/health" variant="secondary">
              <HeartPulse className="h-4 w-4" aria-hidden />
              View health
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 text-sm leading-6 text-[#34404a]">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[#2d6f7f]" aria-hidden />
          <p>
            V1 platform admin is for demo inspection only. Tenant operations,
            impersonation, billing changes, and destructive platform actions are
            intentionally not implemented.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

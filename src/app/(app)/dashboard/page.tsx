import { getCurrentOrganizationId, requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const membership = await requireMembership();
  const organizationId = await getCurrentOrganizationId();

  if (!organizationId) {
    return null;
  }

  const [agents, pendingApprovals, auditLogs, policies] = await Promise.all([
    prisma.agent.count({ where: { organizationId } }),
    prisma.approvalRequest.count({
      where: {
        organizationId,
        status: "PENDING",
      },
    }),
    prisma.auditLog.count({ where: { organizationId } }),
    prisma.policy.count({ where: { organizationId } }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-[#4c6f68]">
          {membership.organization.slug}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5c6470]">
          Current organization activity, scoped server-side to{" "}
          {membership.organization.name}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Agents", agents],
          ["Pending approvals", pendingApprovals],
          ["Policies", policies],
          ["Audit logs", auditLogs],
        ].map(([label, value]) => (
          <div className="border border-[#d9dee8] bg-white p-5 shadow-sm" key={label}>
            <p className="text-sm text-[#5c6470]">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

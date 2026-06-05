import { revalidatePath } from "next/cache";
import { MembershipRole } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canManageMembers,
  listMembers,
  removeMember,
  requireMemberViewer,
  updateMemberRole,
} from "@/lib/members";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { memberRoleUpdateSchema } from "@/lib/validators";

type MemberRow = Awaited<ReturnType<typeof listMembers>>[number];

async function updateRoleAction(membershipId: string, formData: FormData) {
  "use server";

  const membership = await requireMemberViewer();
  const input = memberRoleUpdateSchema.parse({
    role: formData.get("role"),
  });

  await updateMemberRole(membership, membershipId, input);
  revalidatePath("/settings/members");
}

async function removeMemberAction(membershipId: string) {
  "use server";

  const membership = await requireMemberViewer();

  await removeMember(membership, membershipId);
  revalidatePath("/settings/members");
}

export default async function MembersPage() {
  const membership = await requireMemberViewer();
  const canManage = canManageMembers(membership.role);
  const members = await listMembers(membership);
  const roleOptions = Object.values(MembershipRole).filter(
    (role) => role !== MembershipRole.platform_owner,
  );

  const columns: DataTableColumn<MemberRow>[] = [
    {
      header: "Member",
      accessor: (row) => (
        <div>
          <p className="font-medium">{row.user.name ?? "Invited user"}</p>
          <p className="text-xs text-[#687384]">{row.user.email}</p>
        </div>
      ),
    },
    {
      header: "Role",
      accessor: (row) =>
        canManage ? (
          <form action={updateRoleAction.bind(null, row.id)} className="flex gap-2">
            <Select className="h-9 min-w-40" defaultValue={row.role} name="role">
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {formatEnumLabel(role)}
                </option>
              ))}
            </Select>
            <Button className="h-9" type="submit" variant="secondary">
              Save
            </Button>
          </form>
        ) : (
          formatEnumLabel(row.role)
        ),
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.user.status} />,
    },
    {
      header: "Joined",
      accessor: (row) => formatDateTime(row.joinedAt),
    },
    {
      header: "Actions",
      accessor: (row) =>
        canManage ? (
          <form action={removeMemberAction.bind(null, row.id)}>
            <Button type="submit" variant="danger">
              Remove
            </Button>
          </form>
        ) : (
          <span className="text-sm text-[#687384]">View only</span>
        ),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button href="/settings/members/invite">Invite member</Button>
            ) : null}
            <Button href="/settings" variant="secondary">
              Back to settings
            </Button>
          </div>
        }
        description="Review organization members and roles. V1 invitations are simulated and do not send email."
        eyebrow={membership.organization.slug}
        title="Members"
      />

      <Card>
        <CardHeader>
          <CardTitle>Organization members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={members}
            emptyDescription="Invite the first teammate to start sharing AgentGate review work."
            emptyTitle="No members"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

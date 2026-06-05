import { redirect } from "next/navigation";
import { MembershipRole } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import {
  inviteMember,
  requireMemberManager,
} from "@/lib/members";
import { formatEnumLabel } from "@/lib/format";
import { memberInviteSchema } from "@/lib/validators";

async function inviteAction(formData: FormData) {
  "use server";

  const membership = await requireMemberManager();
  const input = memberInviteSchema.parse({
    email: formData.get("email"),
    name: formData.get("name") || null,
    role: formData.get("role"),
  });

  await inviteMember(membership, input);
  redirect("/settings/members");
}

export default async function InviteMemberPage() {
  const membership = await requireMemberManager();
  const roleOptions = Object.values(MembershipRole).filter(
    (role) => role !== MembershipRole.platform_owner,
  );

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/settings/members" variant="secondary">
            Back to members
          </Button>
        }
        description="Create a demo-only member invitation. AgentGate V1 does not send real email."
        eyebrow={membership.organization.slug}
        title="Invite member"
      />

      <Card>
        <CardHeader>
          <CardTitle>Invite details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={inviteAction} className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium">
              Email
              <Input name="email" placeholder="teammate@example.com" required type="email" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Name optional
              <Input name="name" placeholder="Teammate name" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Role
              <Select defaultValue={MembershipRole.auditor} name="role" required>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {formatEnumLabel(role)}
                  </option>
                ))}
              </Select>
            </label>

            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4 text-sm leading-6 text-[#34404a]">
              This V1 flow creates or updates the user and organization membership,
              then records an audit log. It shows a simulated invite path in API
              responses but does not send email.
            </div>

            <div className="flex justify-end border-t border-[#e5e9ef] pt-5">
              <Button type="submit">Create simulated invite</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

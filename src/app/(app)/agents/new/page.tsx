import { redirect } from "next/navigation";
import { AgentRiskTier, AgentStatus, ToolType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAgent, requireAgentManager } from "@/lib/agents";
import { formatEnumLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { parseAgentFormData } from "@/lib/validators";

async function createAgentAction(formData: FormData) {
  "use server";

  const membership = await requireAgentManager();
  const input = parseAgentFormData(formData);

  await createAgent(membership, input);
}

export default async function NewAgentPage() {
  const membership = await requireAgentManager();

  if (!membership) {
    redirect("/login");
  }

  const owners = await prisma.membership.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: {
      user: {
        email: "asc",
      },
    },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        description="Create an organization-scoped agent profile with allowed tools and risk defaults."
        eyebrow={membership.organization.slug}
        title="New agent"
      />

      <Card>
        <CardHeader>
          <CardTitle>Agent profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAgentAction} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Name
                <Input name="name" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <Input
                  name="slug"
                  placeholder="Generated from name if left blank"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Description
              <Textarea name="description" />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Department
                <Input name="department" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Owner
                <Select name="ownerUserId">
                  <option value="">Unassigned</option>
                  {owners.map(({ user }) => (
                    <option key={user.id} value={user.id}>
                      {user.name ?? user.email}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Risk tier
                <Select name="riskTier" required defaultValue={AgentRiskTier.STANDARD}>
                  {Object.values(AgentRiskTier).map((tier) => (
                    <option key={tier} value={tier}>
                      {formatEnumLabel(tier)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Status
                <Select name="status" required defaultValue={AgentStatus.ACTIVE}>
                  {Object.values(AgentStatus).map((status) => (
                    <option key={status} value={status}>
                      {formatEnumLabel(status)}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold">Allowed tools</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(ToolType).map((tool) => (
                  <label
                    className="flex items-center gap-2 border border-[#d9dee8] bg-[#f8fafc] px-3 py-2 text-sm"
                    key={tool}
                  >
                    <input name="allowedTools" type="checkbox" value={tool} />
                    {formatEnumLabel(tool)}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end gap-3 border-t border-[#e5e9ef] pt-5">
              <Button href="/agents" variant="secondary">
                Cancel
              </Button>
              <Button type="submit">Create agent</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

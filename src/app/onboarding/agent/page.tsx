import { redirect } from "next/navigation";
import { AgentRiskTier, AgentStatus, ToolType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAuditLog } from "@/server/audit/audit-service";
import { getMembershipForUser, requireUser } from "@/lib/auth";
import { formatEnumLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { agentInputSchema, slugifyAgentName } from "@/lib/validators";
import { OnboardingShell } from "@/app/onboarding/_components/onboarding-shell";

type AgentOnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function resolveAvailableAgentSlug(organizationId: string, name: string) {
  const baseSlug = slugifyAgentName(name);

  for (let index = 0; index < 20; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const existing = await prisma.agent.findFirst({
      where: {
        organizationId,
        slug: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

async function createFirstAgentAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const membership = await getMembershipForUser(user.id);

  if (!membership) {
    redirect("/onboarding/organization");
  }

  const name = String(formData.get("name") ?? "");
  const submittedSlug = String(formData.get("slug") ?? "").trim();
  const slug =
    submittedSlug ||
    (await resolveAvailableAgentSlug(membership.organizationId, name));

  const parsed = agentInputSchema.safeParse({
    name,
    slug,
    description: formData.get("description") || null,
    department: formData.get("department") || null,
    ownerUserId: user.id,
    status: AgentStatus.ACTIVE,
    riskTier: formData.get("riskTier"),
    allowedTools: formData.getAll("allowedTools"),
  });

  if (!parsed.success) {
    redirect("/onboarding/agent?error=invalid");
  }

  const agentCount = await prisma.agent.count({
    where: {
      organizationId: membership.organizationId,
    },
  });

  const agent = await prisma.agent.create({
    data: {
      organizationId: membership.organizationId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description?.trim() || null,
      department: parsed.data.department?.trim() || null,
      ownerUserId: user.id,
      status: AgentStatus.ACTIVE,
      riskTier: parsed.data.riskTier,
      allowedToolsJson: parsed.data.allowedTools,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      riskTier: true,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: user.id,
    eventType: "agent.created",
    targetType: "Agent",
    targetId: agent.id,
    metadataJson: {
      name: agent.name,
      slug: agent.slug,
      status: agent.status,
      riskTier: agent.riskTier,
      source: "onboarding",
      firstAgent: agentCount === 0,
    },
  });

  redirect(`/onboarding/api-key?agentId=${agent.id}`);
}

export default async function AgentOnboardingPage({
  searchParams,
}: AgentOnboardingPageProps) {
  const user = await requireUser();
  const membership = await getMembershipForUser(user.id);
  const { error } = await searchParams;

  if (!membership) {
    redirect("/onboarding/organization");
  }

  const existingAgents = await prisma.agent.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <OnboardingShell
      activeStep={3}
      description="Register the first AI agent that will call the Gateway API. You can add more agents later from the Agents section."
      eyebrow={membership.organization.slug}
      title="Register your first AI agent"
    >
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Agent profile</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-5 border border-[#e6c6b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#9d3f1f]">
              Check the agent fields and choose at least one allowed tool.
            </div>
          ) : null}

          {existingAgents.length > 0 ? (
            <div className="mb-5 flex flex-col gap-3 border border-[#d9dee8] bg-[#f8fafc] p-4 text-sm text-[#5c6470] sm:flex-row sm:items-center sm:justify-between">
              <span>
                This organization already has {existingAgents.length} agent
                {existingAgents.length === 1 ? "" : "s"}.
              </span>
              <Button
                href={`/onboarding/api-key?agentId=${existingAgents[0].id}`}
                variant="secondary"
              >
                Continue to API key
              </Button>
            </div>
          ) : null}

          <form action={createFirstAgentAction} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Agent name
                <Input
                  name="name"
                  placeholder="Support Refund Agent"
                  required
                />
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
              <Textarea
                name="description"
                placeholder="Handles refund requests and routes high-risk work through AgentGate."
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Department
                <Input name="department" placeholder="Customer Support" />
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
            </div>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold">Allowed tools</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(ToolType).map((tool) => (
                  <label
                    className="flex items-center gap-2 border border-[#d9dee8] bg-[#f8fafc] px-3 py-2 text-sm"
                    key={tool}
                  >
                    <input
                      defaultChecked={
                        tool === ToolType.STRIPE ||
                        tool === ToolType.EMAIL_PREVIEW ||
                        tool === ToolType.SLACK
                      }
                      name="allowedTools"
                      type="checkbox"
                      value={tool}
                    />
                    {formatEnumLabel(tool)}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end border-t border-[#e5e9ef] pt-5">
              <Button type="submit">Create agent</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </OnboardingShell>
  );
}

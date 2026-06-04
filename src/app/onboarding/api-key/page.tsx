import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAuditLog } from "@/server/audit/audit-service";
import { createApiKey } from "@/lib/api-keys";
import { getMembershipForUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiKeyCreateSchema } from "@/lib/validators";
import { OnboardingShell } from "@/app/onboarding/_components/onboarding-shell";
import {
  ApiKeyOnboardingForm,
  type OnboardingApiKeyState,
} from "@/app/onboarding/api-key/api-key-onboarding-form";

type ApiKeyOnboardingPageProps = {
  searchParams: Promise<{
    agentId?: string;
  }>;
};

async function createOnboardingApiKeyAction(
  _state: OnboardingApiKeyState,
  formData: FormData,
): Promise<OnboardingApiKeyState> {
  "use server";

  const user = await requireUser();
  const membership = await getMembershipForUser(user.id);

  if (!membership) {
    redirect("/onboarding/organization");
  }

  const parsed = apiKeyCreateSchema.safeParse({
    name: formData.get("name"),
    agentId: formData.get("agentId") || null,
    expiresAt: null,
  });

  if (!parsed.success) {
    return {
      error: "Check the API key fields and try again.",
      fullKey: null,
      keyPrefix: null,
    };
  }

  try {
    const apiKeyCount = await prisma.apiKey.count({
      where: {
        organizationId: membership.organizationId,
      },
    });

    const result = await createApiKey(membership, parsed.data);

    await createAuditLog({
      organizationId: membership.organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "onboarding.first_api_key_created",
      targetType: "ApiKey",
      targetId: result.apiKey.id,
      metadataJson: {
        keyPrefix: result.apiKey.keyPrefix,
        agentId: result.apiKey.agent?.id ?? null,
        firstApiKey: apiKeyCount === 0,
      },
    });

    return {
      error: null,
      fullKey: result.fullKey,
      keyPrefix: result.apiKey.keyPrefix,
    };
  } catch {
    return {
      error: "API key creation failed.",
      fullKey: null,
      keyPrefix: null,
    };
  }
}

export default async function ApiKeyOnboardingPage({
  searchParams,
}: ApiKeyOnboardingPageProps) {
  const user = await requireUser();
  const membership = await getMembershipForUser(user.id);
  const { agentId } = await searchParams;

  if (!membership) {
    redirect("/onboarding/organization");
  }

  const agents = await prisma.agent.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (agents.length === 0) {
    redirect("/onboarding/agent");
  }

  const defaultAgentId = agents.some((agent) => agent.id === agentId)
    ? agentId
    : agents[0]?.id;

  return (
    <OnboardingShell
      activeStep={4}
      description="Create the first gateway credential for your agent. The key can call AgentGate APIs but cannot log into the human dashboard."
      eyebrow={membership.organization.slug}
      title="Create your first API key"
    >
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Gateway API key</CardTitle>
        </CardHeader>
        <CardContent>
          <ApiKeyOnboardingForm
            agents={agents}
            createAction={createOnboardingApiKeyAction}
            defaultAgentId={defaultAgentId}
          />
        </CardContent>
      </Card>
    </OnboardingShell>
  );
}

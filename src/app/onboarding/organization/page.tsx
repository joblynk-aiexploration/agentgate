import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  BillingPlan,
  BillingStatus,
  MembershipRole,
  OrganizationStatus,
} from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAuditLog } from "@/server/audit/audit-service";
import { getMembershipForUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  organizationOnboardingSchema,
  slugifyOrganizationName,
} from "@/lib/validators";
import { OnboardingShell } from "@/app/onboarding/_components/onboarding-shell";

type OrganizationOnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function resolveAvailableOrganizationSlug(name: string) {
  const baseSlug = slugifyOrganizationName(name);

  for (let index = 0; index < 20; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const existing = await prisma.organization.findUnique({
      where: {
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

async function createOrganizationAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const existingMembership = await getMembershipForUser(user.id);

  if (existingMembership) {
    redirect("/dashboard");
  }

  const parsed = organizationOnboardingSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    redirect("/onboarding/organization?error=invalid");
  }

  const slug = await resolveAvailableOrganizationSlug(parsed.data.name);

  const organization = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug,
      plan: BillingPlan.FREE,
      status: OrganizationStatus.ACTIVE,
      memberships: {
        create: {
          userId: user.id,
          role: MembershipRole.org_owner,
        },
      },
      billingSubscription: {
        create: {
          plan: BillingPlan.FREE,
          status: BillingStatus.TRIALING,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const headerStore = await headers();
  const ipAddress =
    headerStore.get("x-forwarded-for")?.split(",").at(0)?.trim() ??
    headerStore.get("x-real-ip");

  await createAuditLog({
    organizationId: organization.id,
    actorType: "user",
    actorId: user.id,
    eventType: "organization.created",
    targetType: "Organization",
    targetId: organization.id,
    metadataJson: {
      name: organization.name,
      slug: organization.slug,
      source: "onboarding",
    },
    ipAddress,
    userAgent: headerStore.get("user-agent"),
  });

  redirect("/onboarding/agent");
}

export default async function OrganizationOnboardingPage({
  searchParams,
}: OrganizationOnboardingPageProps) {
  const user = await requireUser();
  const membership = await getMembershipForUser(user.id);
  const { error } = await searchParams;

  if (membership) {
    redirect("/dashboard");
  }

  return (
    <OnboardingShell
      activeStep={2}
      description="Create the tenant workspace that will own agents, policies, API keys, approvals, and audit logs."
      title="Create your organization"
    >
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-5 border border-[#e6c6b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#9d3f1f]">
              Enter a valid organization name.
            </div>
          ) : null}

          <form action={createOrganizationAction} className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium">
              Organization name
              <Input
                autoComplete="organization"
                name="name"
                placeholder="Acme AI Operations"
                required
              />
            </label>

            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4 text-sm leading-6 text-[#5c6470]">
              You will become the organization owner. V1 uses local rules only,
              no paid AI APIs, and no real external integration side effects.
            </div>

            <div className="flex justify-end">
              <Button type="submit">Create organization</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </OnboardingShell>
  );
}

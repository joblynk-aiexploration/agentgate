import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePolicyManager } from "@/lib/policies";
import { PolicyForm } from "@/app/(app)/policies/_components/policy-form";

export default async function NewPolicyPage() {
  const membership = await requirePolicyManager();

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/policies" variant="secondary">
            Back to policies
          </Button>
        }
        description="Create an organization-scoped ruleset for AgentGate gateway decisions."
        eyebrow={membership.organization.slug}
        title="New policy"
      />

      <PolicyForm canManage />
    </section>
  );
}

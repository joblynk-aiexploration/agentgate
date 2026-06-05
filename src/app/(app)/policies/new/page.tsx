import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePolicyManager } from "@/lib/policies";
import { PolicyForm } from "@/app/(app)/policies/_components/policy-form";
import { getPolicyTemplate } from "@/server/policies/templates";

type NewPolicyPageProps = {
  searchParams: Promise<{
    template?: string;
  }>;
};

export default async function NewPolicyPage({ searchParams }: NewPolicyPageProps) {
  const membership = await requirePolicyManager();
  const { template: templateId } = await searchParams;
  const template = templateId ? getPolicyTemplate(templateId) : null;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/policies" variant="secondary">
            Back to policies
          </Button>
        }
        description={
          template
            ? "Start from a built-in template, then edit the policy before saving it to this organization."
            : "Create an organization-scoped ruleset for AgentGate gateway decisions."
        }
        eyebrow={membership.organization.slug}
        title={template ? "Create from template" : "New policy"}
      />

      <PolicyForm
        canManage
        initialTemplate={template ? { id: template.id, policy: template.policy } : undefined}
      />
    </section>
  );
}

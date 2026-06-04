import { CheckCircle2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole, roleRules } from "@/lib/permissions";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const plans = [
  {
    name: "Starter",
    price: "$99/month",
    audience: "Small teams validating agent controls",
    features: ["Agent registry", "Gateway checks", "Approval inbox"],
  },
  {
    name: "Agency",
    price: "$499/month",
    audience: "Multi-client teams and operators",
    features: ["More agents", "Policy templates", "Audit exports"],
  },
  {
    name: "Business",
    price: "$1,999/month",
    audience: "Production AI operations teams",
    features: ["Higher volume", "Advanced reports", "Priority controls"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    audience: "Large organizations with custom governance",
    features: ["SAML placeholder", "Custom review flows", "Dedicated support"],
  },
] as const;

export default async function BillingPage() {
  const membership = await requireRole(roleRules.manageBilling);
  const subscription = await prisma.billingSubscription.findUnique({
    where: {
      organizationId: membership.organizationId,
    },
  });

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Review the current display-only V1 subscription state. AgentGate V1 does not create live Stripe charges."
        eyebrow={membership.organization.slug}
        title="Billing"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          detail="Organization plan"
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          label="Current plan"
          value={formatEnumLabel(subscription?.plan ?? membership.organization.plan)}
        />
        <MetricCard
          detail="Billing subscription model"
          label="Subscription status"
          value={<StatusBadge status={subscription?.status ?? "TRIALING"} />}
        />
        <MetricCard
          detail="Display only in V1"
          label="Current period end"
          value={formatDateTime(subscription?.currentPeriodEnd)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>V1 billing scope</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-[#5c6470]">
            Billing is represented with local subscription data only. No live Stripe
            checkout, payment methods, invoices, or external billing side effects are
            implemented in AgentGate V1.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.name}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{plan.name}</CardTitle>
                {formatEnumLabel(subscription?.plan ?? membership.organization.plan) ===
                plan.name ? (
                  <Badge tone="green">Current</Badge>
                ) : (
                  <Badge tone="slate">Placeholder</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-[#111318]">
                {plan.price}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#5c6470]">{plan.audience}</p>
              <ul className="mt-5 grid gap-3 text-sm text-[#34404a]">
                {plan.features.map((feature) => (
                  <li className="flex items-center gap-2" key={feature}>
                    <CheckCircle2 className="h-4 w-4 text-[#20634f]" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

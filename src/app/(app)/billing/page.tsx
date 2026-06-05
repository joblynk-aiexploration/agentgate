import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";
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
    features: [
      "Agent registry",
      "Gateway checks",
      "Approval inbox",
      "Audit log basics",
    ],
  },
  {
    name: "Agency",
    price: "$499/month",
    audience: "Multi-client teams and operators",
    features: [
      "More agents",
      "Policy templates",
      "Audit exports",
      "Demo integrations",
    ],
  },
  {
    name: "Business",
    price: "$1,999/month",
    audience: "Production AI operations teams",
    features: [
      "Higher volume",
      "Advanced reports",
      "Kill switch controls",
      "Developer API",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    audience: "Large organizations with custom governance",
    features: [
      "Custom governance planning",
      "SSO roadmap",
      "Dedicated review flows",
      "Deployment support roadmap",
    ],
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
        description="Review V1 placeholder pricing and the current display-only subscription state. No live Stripe billing is implemented."
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
        <CardContent className="flex items-start gap-3 text-sm leading-6 text-[#5c6470]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9d6b1f]" aria-hidden />
          <p>
            Billing is represented with local subscription data only. These plans
            are product placeholders for the demo. AgentGate V1 does not create
            live Stripe checkout sessions, payment methods, invoices, charges, or
            external billing side effects.
          </p>
        </CardContent>
      </Card>

      <div>
        <p className="text-xs font-semibold uppercase text-[#4c6f68]">
          Placeholder pricing
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#111318]">
          Plans for explaining packaging, not charging customers in V1
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card
            className={
              plan.name === "Business" ? "border-[#2d6f7f] shadow-md" : undefined
            }
            key={plan.name}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.name === "Business" ? (
                    <p className="mt-1 text-xs font-semibold uppercase text-[#2d6f7f]">
                      Demo default
                    </p>
                  ) : null}
                </div>
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
              <p className="mt-3 text-xs font-semibold uppercase text-[#687384]">
                V1 placeholder
              </p>
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

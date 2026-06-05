import {
  Cable,
  Database,
  GitBranch,
  Mail,
  MessageSquare,
  PanelsTopLeft,
  Send,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { WebhookDemoCard } from "@/app/(app)/integrations/_components/webhook-demo-card";
import {
  parseWebhookDemoConfig,
  webhookDemoExamplePayload,
  webhookDemoManagerRoles,
} from "@/server/integrations/webhook-demo";
import { requireMembership } from "@/lib/auth";
import { formatEnumLabel } from "@/lib/format";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const integrationCards = [
  {
    name: "Slack Demo",
    toolType: "SLACK",
    icon: MessageSquare,
    detail: "Simulated internal notifications for approval and audit workflows.",
    simulated: true,
  },
  {
    name: "Stripe Test Mode",
    toolType: "STRIPE",
    icon: WalletCards,
    detail: "Refund checks are policy-evaluated, but V1 never creates real refunds.",
    simulated: true,
  },
  {
    name: "Email Preview",
    toolType: "EMAIL_PREVIEW",
    icon: Mail,
    detail: "Customer emails are rendered as preview-only approval requests.",
    simulated: true,
  },
  {
    name: "HubSpot Coming Soon",
    toolType: "HUBSPOT",
    icon: PanelsTopLeft,
    detail: "CRM actions are represented as disabled V1 placeholders.",
    simulated: false,
  },
  {
    name: "Salesforce Coming Soon",
    toolType: "SALESFORCE",
    icon: PanelsTopLeft,
    detail: "Enterprise CRM controls are planned but not connected in V1.",
    simulated: false,
  },
  {
    name: "GitHub Coming Soon",
    toolType: "GITHUB",
    icon: GitBranch,
    detail: "Repository actions are not connected in V1.",
    simulated: false,
  },
  {
    name: "Postgres Demo",
    toolType: "POSTGRES",
    icon: Database,
    detail: "Database writes are simulated only; no production database writes are executed.",
    simulated: true,
  },
  {
    name: "Webhook Demo",
    toolType: "WEBHOOK",
    icon: Cable,
    detail: "Webhook execution is represented as a demo-only gateway target.",
    simulated: true,
  },
] as const;

export default async function IntegrationsPage() {
  const membership = await requireMembership();
  const connections = await prisma.toolConnection.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    select: {
      configJson: true,
      name: true,
      status: true,
      toolType: true,
      updatedAt: true,
    },
  });
  const connectionByTool = new Map(connections.map((connection) => [connection.toolType, connection]));
  const webhookConnection = connectionByTool.get("WEBHOOK");
  const canManageWebhookDemo = hasRole(membership.role, webhookDemoManagerRoles);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Review V1 demo tool connections. AgentGate simulates external execution and does not require live credentials."
        eyebrow={membership.organization.slug}
        title="Integrations"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {integrationCards.map((integration) => {
          const connection = connectionByTool.get(integration.toolType);
          const Icon = integration.icon;

          if (integration.toolType === "WEBHOOK") {
            return (
              <WebhookDemoCard
                canManage={canManageWebhookDemo}
                config={parseWebhookDemoConfig(webhookConnection?.configJson)}
                examplePayload={webhookDemoExamplePayload}
                key={integration.name}
                status={webhookConnection?.status ?? "DEMO"}
              />
            );
          }

          return (
            <Card key={integration.name}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center border border-[#d9dee8] bg-[#f8fafc] text-[#2d6f7f]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <CardTitle>{integration.name}</CardTitle>
                  </div>
                  <StatusBadge status={connection?.status ?? "DISABLED"} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={integration.simulated ? "blue" : "slate"}>
                    {integration.simulated ? "Demo only" : "Coming soon"}
                  </Badge>
                  <Badge tone="slate">{formatEnumLabel(integration.toolType)}</Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#5c6470]">
                  {integration.detail}
                </p>
                <p className="mt-4 text-xs text-[#687384]">
                  No real external credentials or side effects are required in V1.
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent>
          <div className="flex items-start gap-3 text-sm leading-6 text-[#34404a]">
            <Send className="mt-0.5 h-4 w-4 shrink-0 text-[#2d6f7f]" aria-hidden />
            <p>
              Slack messages, Stripe refunds, emails, webhooks, and database writes are
              simulated by AgentGate V1. The gateway records the decision trail without
              calling real third-party systems.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

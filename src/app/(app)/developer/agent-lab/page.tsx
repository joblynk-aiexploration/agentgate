import { FlaskConical, KeyRound, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/permissions";
import { listSupportAgentScenariosForLab } from "@/server/demo/support-agent-runner";
import { AgentLabClient } from "@/app/(app)/developer/agent-lab/agent-lab-client";

const agentLabRoles = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
  "reviewer",
] as const;

export default async function AgentLabPage() {
  const membership = await requireRole([...agentLabRoles]);
  const scenarios = listSupportAgentScenariosForLab();

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/developer/api-keys" variant="secondary">
              <KeyRound className="h-4 w-4" aria-hidden />
              API keys
            </Button>
            <Button href="/developer/docs" variant="secondary">
              Developer docs
            </Button>
            <Button href="/approvals">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Approval Inbox
            </Button>
          </div>
        }
        description="Run the local Support Operations Agent from the browser and watch AgentGate decide, approve, block, or simulate execution."
        eyebrow={membership.organization.slug}
        title="Agent Lab"
      />

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-1 h-5 w-5 text-[#2d6f7f]" aria-hidden />
            <div>
              <p className="font-semibold text-[#172326]">
                Browser runs are controlled through AgentGate.
              </p>
              <p className="mt-2 text-sm leading-6 text-[#5c6470]">
                Agent Lab never shells out, never exposes the full demo API key,
                never uses paid AI APIs, and never calls real Stripe, Gmail,
                Slack, Postgres, or external webhook systems. All execution in V1
                is simulated.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Badge tone="green">Local rules only</Badge>
            <Badge tone="blue">Simulated tools</Badge>
            <Badge tone="slate">Server-side key</Badge>
          </div>
        </CardContent>
      </Card>

      <AgentLabClient scenarios={scenarios} />
    </section>
  );
}

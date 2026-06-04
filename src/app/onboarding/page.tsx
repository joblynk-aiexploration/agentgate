import { redirect } from "next/navigation";
import { ArrowRight, Building2, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMembershipForUser, requireUser } from "@/lib/auth";
import { OnboardingShell } from "@/app/onboarding/_components/onboarding-shell";

const cards = [
  {
    title: "Create an organization",
    detail: "Start a tenant-isolated workspace where policies and audit logs live.",
    icon: Building2,
  },
  {
    title: "Register an agent",
    detail: "Describe the first AI agent and the tools it is allowed to request.",
    icon: ShieldCheck,
  },
  {
    title: "Issue an API key",
    detail: "Generate a gateway key for agent requests. It is shown once only.",
    icon: KeyRound,
  },
];

export default async function OnboardingPage() {
  const user = await requireUser();
  const membership = await getMembershipForUser(user.id);

  if (membership) {
    redirect("/dashboard");
  }

  return (
    <OnboardingShell
      activeStep={2}
      description="AgentGate needs a workspace before it can evaluate agent actions. This short setup keeps human login, organization ownership, agent identity, and gateway API keys separated."
      title="Set up your AgentGate workspace"
    >
      <section className="grid gap-5 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title}>
              <CardHeader>
                <Icon className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
                <CardTitle className="mt-3">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-[#5c6470]">{card.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="flex justify-end">
        <Button href="/onboarding/organization">
          Create organization
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </OnboardingShell>
  );
}

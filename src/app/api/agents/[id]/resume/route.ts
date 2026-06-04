import { NextResponse } from "next/server";
import { resumeAgent, getApiAgentManagerMembership } from "@/lib/agents";

type AgentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: AgentRouteContext) {
  const membership = await getApiAgentManagerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const agent = await resumeAgent(membership, id);

  return NextResponse.json({ agent });
}

import { NextResponse } from "next/server";
import { isAdminLoggedIn } from "@/lib/admin-auth";
import { checkWithAgentGate } from "@/server/agent/agentgate-client";

export async function POST(request: Request) {
  if (!(await isAdminLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decision = await checkWithAgentGate({
      action: "integration.test",
      environment: "sandbox",
      metadata: { source: "northstar-admin-api-test" },
      payload: { simulated: true },
      reason: "Admin is testing AgentGate connection from Northstar demo store.",
      tool: "demo_commerce",
    });

    const url = new URL("/admin/api", request.url);
    url.searchParams.set("test", decision.decision);
    url.searchParams.set("risk", decision.risk.level);

    return NextResponse.redirect(url, 303);
  } catch (error) {
    const url = new URL("/admin/api", request.url);
    url.searchParams.set("error", error instanceof Error ? error.message : "test_failed");

    return NextResponse.redirect(url, 303);
  }
}

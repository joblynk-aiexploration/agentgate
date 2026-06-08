import { NextResponse } from "next/server";
import { isAdminLoggedIn } from "@/lib/admin-auth";
import { syncApprovedAgentGateOrders } from "@/server/agent/agentgate-sync";

export async function POST(request: Request) {
  if (!(await isAdminLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncApprovedAgentGateOrders();
    const url = new URL("/admin/orders", request.url);
    url.searchParams.set("synced", String(result.executed));
    url.searchParams.set("checked", String(result.checked));

    return NextResponse.redirect(url, 303);
  } catch (error) {
    const url = new URL("/admin/orders", request.url);
    url.searchParams.set(
      "syncError",
      error instanceof Error ? error.message : "AgentGate sync failed",
    );

    return NextResponse.redirect(url, 303);
  }
}

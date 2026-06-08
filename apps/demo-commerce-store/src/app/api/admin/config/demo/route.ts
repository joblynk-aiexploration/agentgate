import { NextResponse } from "next/server";
import { isAdminLoggedIn } from "@/lib/admin-auth";
import { defaultAdminConfig, writeAdminConfig } from "@/lib/store";

export async function POST(request: Request) {
  if (!(await isAdminLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  writeAdminConfig({
    ...defaultAdminConfig,
    agentGateApiKey: "ag_test_seed_demo_commerce_agent_key",
  });

  return NextResponse.redirect(new URL("/admin/api?saved=demo", request.url), 303);
}

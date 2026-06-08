import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminLoggedIn } from "@/lib/admin-auth";
import { readAdminConfig, safeAdminConfig, writeAdminConfig } from "@/lib/store";

const configSchema = z.object({
  agentGateBaseUrl: z.string().url(),
  agentGateApiKey: z.string().trim().optional(),
  agentId: z.string().trim().min(1),
  environment: z.enum(["production", "sandbox"]),
});

export async function GET() {
  if (!(await isAdminLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(safeAdminConfig());
}

export async function POST(request: Request) {
  if (!(await isAdminLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const parsed = configSchema.safeParse({
    agentGateApiKey: String(form.get("agentGateApiKey") ?? "").trim() || undefined,
    agentGateBaseUrl: String(form.get("agentGateBaseUrl") ?? "").trim(),
    agentId: String(form.get("agentId") ?? "").trim(),
    environment: String(form.get("environment") ?? "production"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin/api?error=invalid", request.url), 303);
  }

  const existing = readAdminConfig();
  writeAdminConfig({
    agentGateApiKey: parsed.data.agentGateApiKey ?? existing.agentGateApiKey,
    agentGateBaseUrl: parsed.data.agentGateBaseUrl,
    agentId: parsed.data.agentId,
    environment: parsed.data.environment,
  });

  return NextResponse.redirect(new URL("/admin/api?saved=1", request.url), 303);
}

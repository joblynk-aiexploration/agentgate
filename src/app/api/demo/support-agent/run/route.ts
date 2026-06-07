import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentMembership } from "@/lib/auth";
import {
  isSupportAgentScenarioName,
  runSupportAgentLabScenario,
  SupportAgentLabError,
} from "@/server/demo/support-agent-runner";

const supportAgentRunSchema = z.object({
  scenario: z.string().refine(isSupportAgentScenarioName, {
    message: "Unknown support agent scenario.",
  }),
});

export async function POST(request: Request) {
  try {
    const membership = await getCurrentMembership();

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = supportAgentRunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await runSupportAgentLabScenario({
      organizationId: membership.organizationId,
      role: membership.role,
      scenarioName: parsed.data.scenario,
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Support agent run failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    if (error instanceof SupportAgentLabError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Support agent run failed." },
      { status: 500 },
    );
  }
}

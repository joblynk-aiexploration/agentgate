import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import {
  canUseSupportAgentLab,
  listSupportAgentScenariosForLab,
} from "@/server/demo/support-agent-runner";

export async function GET() {
  try {
    const membership = await getCurrentMembership();

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canUseSupportAgentLab(membership.role)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({
      scenarios: listSupportAgentScenariosForLab(),
    });
  } catch (error) {
    console.error("Support agent scenarios failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      { error: "Support agent scenarios failed." },
      { status: 500 },
    );
  }
}

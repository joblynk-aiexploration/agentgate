import { NextResponse } from "next/server";
import { z } from "zod";
import { runCommerceAgent } from "@/server/agent/commerce-agent";

const chatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  sessionId: z.string().trim().min(1).max(160),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const result = await runCommerceAgent(parsed.data);
  return NextResponse.json(result);
}

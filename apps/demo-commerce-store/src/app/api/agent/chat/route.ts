import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentCustomer } from "@/lib/customer-auth";
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

  const customer = await getCurrentCustomer();
  const result = await runCommerceAgent({
    ...parsed.data,
    customer: customer
      ? {
          id: customer.id,
          email: customer.email,
          name: customer.name,
        }
      : undefined,
  });
  return NextResponse.json(result);
}

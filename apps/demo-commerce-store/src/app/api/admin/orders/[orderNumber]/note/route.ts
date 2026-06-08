import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminLoggedIn } from "@/lib/admin-auth";
import { addOrderEvent, readStore } from "@/lib/store";

const noteSchema = z.object({
  note: z.string().trim().min(2).max(500),
  visibility: z.enum(["internal", "customer"]).default("internal"),
});

type Context = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(request: Request, context: Context) {
  if (!(await isAdminLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderNumber } = await context.params;
  const form = await request.formData();
  const parsed = noteSchema.safeParse({
    note: String(form.get("note") ?? ""),
    visibility: String(form.get("visibility") ?? "internal"),
  });
  const order = readStore().orders.find((item) => item.number.toLowerCase() === orderNumber.toLowerCase());

  if (!parsed.success || !order) {
    return NextResponse.redirect(new URL(`/admin/orders/${orderNumber}?error=note`, request.url), 303);
  }

  addOrderEvent(order, {
    actorLabel: "Northstar Admin",
    actorType: "admin",
    description: parsed.data.note,
    message: parsed.data.note,
    title: parsed.data.visibility === "customer" ? "Tracking note added" : "Internal note added",
    type: "admin.note_added",
    visibleToCustomer: parsed.data.visibility === "customer",
  });

  return NextResponse.redirect(new URL(`/admin/orders/${orderNumber}?updated=1`, request.url), 303);
}

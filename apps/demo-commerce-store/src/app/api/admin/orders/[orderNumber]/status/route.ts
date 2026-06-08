import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminLoggedIn } from "@/lib/admin-auth";
import { addOrderEvent, readStore, updateOrder } from "@/lib/store";
import type { Order, OrderEvent } from "@/lib/types";

const statusSchema = z.object({
  status: z.enum(["processing", "packed", "shipped", "delivered", "cancelled"]),
});

type Context = {
  params: Promise<{ orderNumber: string }>;
};

const eventByStatus: Record<string, { type: OrderEvent["type"]; title: string; message: string }> = {
  cancelled: {
    message: "Admin manually cancelled this local demo order.",
    title: "Order cancelled by admin",
    type: "order.cancelled",
  },
  delivered: {
    message: "Admin marked this local demo order delivered.",
    title: "Delivered",
    type: "fulfillment.delivered",
  },
  packed: {
    message: "Admin marked this local demo order packed.",
    title: "Packed",
    type: "fulfillment.packed",
  },
  processing: {
    message: "Admin returned this local demo order to processing.",
    title: "Processing",
    type: "fulfillment.queued",
  },
  shipped: {
    message: "Admin marked this local demo order shipped.",
    title: "Shipped",
    type: "fulfillment.shipped",
  },
};

export async function POST(request: Request, context: Context) {
  if (!(await isAdminLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderNumber } = await context.params;
  const form = await request.formData();
  const parsed = statusSchema.safeParse({ status: String(form.get("status") ?? "") });
  const order = readStore().orders.find((item) => item.number.toLowerCase() === orderNumber.toLowerCase());

  if (!parsed.success || !order) {
    return NextResponse.redirect(new URL(`/admin/orders/${orderNumber}?error=status`, request.url), 303);
  }

  const updated: Order = {
    ...order,
    eligibleForCancellation: parsed.data.status === "processing",
    eligibleForReturn: parsed.data.status === "delivered",
    status: parsed.data.status,
  };
  updateOrder(updated);

  const event = eventByStatus[parsed.data.status];
  addOrderEvent(updated, {
    actorLabel: "Northstar Admin",
    actorType: "admin",
    description: event.message,
    message: event.message,
    title: event.title,
    type: event.type,
    visibleToCustomer: true,
  });

  return NextResponse.redirect(new URL(`/admin/orders/${orderNumber}?updated=1`, request.url), 303);
}

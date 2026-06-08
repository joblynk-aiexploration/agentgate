import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestCartOwner } from "@/lib/customer-auth";
import { updateCartItem } from "@/lib/store";

const updateCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(99),
});

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = updateCartSchema.safeParse({
    productId: String(form.get("productId") ?? ""),
    quantity: form.get("quantity") ?? 0,
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/cart?error=invalid", request.url), 303);
  }

  const { owner } = await getRequestCartOwner();
  updateCartItem(owner, parsed.data.productId, parsed.data.quantity);

  return NextResponse.redirect(new URL("/cart", request.url), 303);
}

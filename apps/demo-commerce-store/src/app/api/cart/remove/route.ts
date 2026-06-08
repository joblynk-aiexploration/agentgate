import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestCartOwner } from "@/lib/customer-auth";
import { updateCartItem } from "@/lib/store";

const removeCartSchema = z.object({
  productId: z.string().min(1),
});

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = removeCartSchema.safeParse({
    productId: String(form.get("productId") ?? ""),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/cart?error=invalid", request.url), 303);
  }

  const { owner } = await getRequestCartOwner();
  updateCartItem(owner, parsed.data.productId, 0);

  return NextResponse.redirect(new URL("/cart", request.url), 303);
}

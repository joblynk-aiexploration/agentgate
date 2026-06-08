import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestCartOwner, setAnonymousCartCookie } from "@/lib/customer-auth";
import { addCartItem } from "@/lib/store";

const addCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = addCartSchema.safeParse({
    productId: String(form.get("productId") ?? ""),
    quantity: form.get("quantity") ?? 1,
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/products?cart=invalid", request.url), 303);
  }

  const { owner } = await getRequestCartOwner();
  const cart = addCartItem(owner, parsed.data.productId, parsed.data.quantity);

  if (!owner.userId) {
    await setAnonymousCartCookie(cart.id);
  }

  return NextResponse.redirect(new URL("/cart?added=1", request.url), 303);
}

import { NextResponse } from "next/server";
import { getRequestCartOwner } from "@/lib/customer-auth";
import { getCart, hydrateCart } from "@/lib/store";

export async function GET() {
  const { customer, owner } = await getRequestCartOwner();
  const cart = getCart(owner);
  const summary = hydrateCart(cart);

  return NextResponse.json({
    loggedIn: Boolean(customer),
    customer: customer ? { name: customer.name, email: customer.email } : null,
    cartCount: summary.count,
  });
}

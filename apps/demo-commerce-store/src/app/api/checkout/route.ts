import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { createCheckoutOrder } from "@/lib/store";

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2),
  addressLine1: z.string().trim().min(2),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  zip: z.string().trim().min(3),
  country: z.string().trim().min(2),
  cardNumber: z.string().trim().min(4),
});

function last4(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, "");
  return digits.slice(-4) || undefined;
}

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return NextResponse.redirect(new URL("/login?returnTo=/checkout", request.url), 303);
  }

  const form = await request.formData();
  const parsed = checkoutSchema.safeParse({
    fullName: String(form.get("fullName") ?? ""),
    addressLine1: String(form.get("addressLine1") ?? ""),
    addressLine2: String(form.get("addressLine2") ?? "") || undefined,
    city: String(form.get("city") ?? ""),
    state: String(form.get("state") ?? ""),
    zip: String(form.get("zip") ?? ""),
    country: String(form.get("country") ?? ""),
    cardNumber: String(form.get("cardNumber") ?? ""),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/checkout?error=invalid", request.url), 303);
  }

  try {
    const order = createCheckoutOrder({
      userId: customer.id,
      shippingAddress: {
        fullName: parsed.data.fullName,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        city: parsed.data.city,
        state: parsed.data.state,
        zip: parsed.data.zip,
        country: parsed.data.country,
      },
      paymentLast4: last4(parsed.data.cardNumber),
    });

    return NextResponse.redirect(new URL(`/checkout/success?order=${order.number}`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/cart?error=checkout", request.url), 303);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { loginCustomer } from "@/lib/customer-auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  returnTo: z.string().optional(),
});

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = loginSchema.safeParse({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
    returnTo: String(form.get("returnTo") ?? "") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const user = await loginCustomer(parsed.data.email, parsed.data.password);

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=credentials", request.url), 303);
  }

  return NextResponse.redirect(new URL(parsed.data.returnTo ?? "/account", request.url), 303);
}

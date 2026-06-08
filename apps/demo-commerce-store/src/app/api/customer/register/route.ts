import { NextResponse } from "next/server";
import { z } from "zod";
import { registerCustomer } from "@/lib/customer-auth";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(120),
});

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = registerSchema.safeParse({
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/register?error=invalid", request.url), 303);
  }

  try {
    await registerCustomer(parsed.data);
  } catch {
    return NextResponse.redirect(new URL("/register?error=exists", request.url), 303);
  }

  return NextResponse.redirect(new URL("/account", request.url), 303);
}

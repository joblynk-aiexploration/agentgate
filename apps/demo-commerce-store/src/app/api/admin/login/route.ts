import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { setAdminSession } from "@/lib/admin-auth";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const store = readStore();

  if (email !== "admin@northstar-demo.dev" || !(await compare(password, store.adminPasswordHash))) {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  await setAdminSession();
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}

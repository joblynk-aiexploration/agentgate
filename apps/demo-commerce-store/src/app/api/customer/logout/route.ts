import { NextResponse } from "next/server";
import { logoutCustomer } from "@/lib/customer-auth";

export async function POST(request: Request) {
  await logoutCustomer();
  return NextResponse.redirect(new URL("/", request.url), 303);
}

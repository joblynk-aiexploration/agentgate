import { NextResponse } from "next/server";
import { isAdminLoggedIn } from "@/lib/admin-auth";
import { defaultAdminConfig, writeAdminConfig } from "@/lib/store";

export async function POST(request: Request) {
  if (!(await isAdminLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  writeAdminConfig(defaultAdminConfig);
  return NextResponse.redirect(new URL("/admin/api?cleared=1", request.url), 303);
}

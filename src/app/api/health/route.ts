import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let database: "connected" | "unavailable" = "connected";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }

  return NextResponse.json({
    ok: true,
    service: "agentgate",
    version: packageJson.version,
    timestamp: new Date().toISOString(),
    database,
  });
}

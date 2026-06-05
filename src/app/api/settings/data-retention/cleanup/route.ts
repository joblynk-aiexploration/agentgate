import { NextResponse } from "next/server";
import {
  cleanupDataRetentionRecords,
  getApiDataRetentionMembership,
} from "@/lib/data-retention";
import { dataRetentionCleanupSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const membership = await getApiDataRetentionMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = dataRetentionCleanupSchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid cleanup request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!parsed.data.confirm) {
    return NextResponse.json(
      { error: "Cleanup execution requires confirm=true." },
      { status: 400 },
    );
  }

  try {
    const result = await cleanupDataRetentionRecords(membership, {
      confirm: true,
    });

    return NextResponse.json({
      counts: result.counts,
      cutoffs: result.cutoffs,
      deleted: result.deleted,
      executed: result.executed,
    });
  } catch (error) {
    console.error("Data retention cleanup failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      { error: "Data retention cleanup failed." },
      { status: 403 },
    );
  }
}

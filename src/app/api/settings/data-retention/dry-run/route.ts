import { NextResponse } from "next/server";
import {
  cleanupDataRetentionRecords,
  getApiDataRetentionMembership,
} from "@/lib/data-retention";

export async function POST() {
  const membership = await getApiDataRetentionMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupDataRetentionRecords(membership, {
    confirm: false,
  });

  return NextResponse.json({
    counts: result.counts,
    cutoffs: result.cutoffs,
    deleted: result.deleted,
    executed: result.executed,
  });
}

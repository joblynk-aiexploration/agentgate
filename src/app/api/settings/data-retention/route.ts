import { NextResponse } from "next/server";
import {
  getApiDataRetentionMembership,
  getDataRetentionDryRun,
  getOrCreateDataRetentionSettings,
  updateDataRetentionSettings,
} from "@/lib/data-retention";
import { dataRetentionSettingsSchema } from "@/lib/validators";

export async function GET() {
  const membership = await getApiDataRetentionMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getOrCreateDataRetentionSettings(
    membership.organizationId,
  );
  const dryRun = await getDataRetentionDryRun(membership);

  return NextResponse.json({
    dryRun: {
      counts: dryRun.counts,
      cutoffs: dryRun.cutoffs,
    },
    settings,
  });
}

export async function PATCH(request: Request) {
  const membership = await getApiDataRetentionMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = dataRetentionSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid retention settings.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const settings = await updateDataRetentionSettings(
      membership,
      parsed.data,
    );

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Data retention settings update failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      { error: "Data retention settings update failed." },
      { status: 403 },
    );
  }
}

import { NextResponse } from "next/server";
import {
  getApiSettingsMembership,
  updateOrganizationSettings,
} from "@/lib/settings";
import { settingsUpdateSchema } from "@/lib/validators";

export async function GET() {
  const membership = await getApiSettingsMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      plan: membership.organization.plan,
      status: membership.organization.status,
      killSwitchEnabled: membership.organization.killSwitchEnabled,
      aiReviewerMode: "LOCAL_RULES_ONLY",
    },
  });
}

export async function PATCH(request: Request) {
  const membership = await getApiSettingsMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const organization = await updateOrganizationSettings(membership, parsed.data);

    return NextResponse.json({
      organization: {
        ...organization,
        aiReviewerMode: "LOCAL_RULES_ONLY",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Settings update failed.",
      },
      { status: 403 },
    );
  }
}

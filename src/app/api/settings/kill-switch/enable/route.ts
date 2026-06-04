import { NextResponse } from "next/server";
import { getApiSettingsMembership, setOrganizationKillSwitch } from "@/lib/settings";

export async function POST() {
  const membership = await getApiSettingsMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const organization = await setOrganizationKillSwitch(membership, true);

    return NextResponse.json({ organization });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kill switch update failed.",
      },
      { status: 403 },
    );
  }
}

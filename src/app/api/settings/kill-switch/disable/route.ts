import { NextResponse } from "next/server";
import { getApiSettingsMembership, setOrganizationKillSwitch } from "@/lib/settings";

export async function POST() {
  const membership = await getApiSettingsMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const organization = await setOrganizationKillSwitch(membership, false);

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Kill switch update failed", error);

    return NextResponse.json(
      { error: "Kill switch update failed." },
      { status: 403 },
    );
  }
}

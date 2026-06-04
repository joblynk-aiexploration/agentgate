import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/server/audit/audit-service";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { destroySession } from "@/lib/session";

async function logout() {
  const membership = await getCurrentMembership();
  const user = membership?.user ?? (await getCurrentUser());

  if (user) {
    const headerStore = await headers();
    const ipAddress =
      headerStore.get("x-forwarded-for")?.split(",").at(0)?.trim() ??
      headerStore.get("x-real-ip");

    await createAuditLog({
      organizationId: membership?.organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "auth.logout",
      targetType: "User",
      targetId: user.id,
      metadataJson: {
        email: user.email,
        organizationSlug: membership?.organization.slug,
      },
      ipAddress,
      userAgent: headerStore.get("user-agent"),
    });
  }

  await destroySession();
  redirect("/login");
}

export async function GET() {
  await logout();
}

export async function POST() {
  await logout();
}

import { notFound, redirect } from "next/navigation";
import { MembershipRole } from "@/generated/prisma/client";
import { getCurrentMembership } from "@/lib/auth";

export type PlatformMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;

export function canAccessPlatform(role: MembershipRole) {
  return role === MembershipRole.platform_owner;
}

export async function requirePlatformOwner() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canAccessPlatform(membership.role)) {
    notFound();
  }

  return membership;
}

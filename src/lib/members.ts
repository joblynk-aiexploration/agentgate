import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  MembershipRole,
  UserStatus,
  type Membership,
} from "@/generated/prisma/client";
import { createAuditLog } from "@/server/audit/audit-service";
import { getCurrentMembership } from "@/lib/auth";
import { hasRole, roleRules } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type {
  memberInviteSchema,
  memberRoleUpdateSchema,
} from "@/lib/validators";
import type { z } from "zod";

export type MemberInviteInput = z.infer<typeof memberInviteSchema>;
export type MemberRoleUpdateInput = z.infer<typeof memberRoleUpdateSchema>;
export type MemberMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;

export function canViewMembers(role: MembershipRole) {
  return hasRole(role, roleRules.viewMembers);
}

export function canManageMembers(role: MembershipRole) {
  return hasRole(role, roleRules.manageMembers);
}

export async function requireMemberViewer() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canViewMembers(membership.role)) {
    notFound();
  }

  return membership;
}

export async function getApiMemberViewer() {
  const membership = await getCurrentMembership();

  if (!membership || !canViewMembers(membership.role)) {
    return null;
  }

  return membership;
}

export async function getApiMemberManager() {
  const membership = await getCurrentMembership();

  if (!membership || !canManageMembers(membership.role)) {
    return null;
  }

  return membership;
}

export async function requireMemberManager() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canManageMembers(membership.role)) {
    notFound();
  }

  return membership;
}

async function countOrganizationOwners(organizationId: string) {
  return prisma.membership.count({
    where: {
      organizationId,
      role: MembershipRole.org_owner,
    },
  });
}

async function getMembershipInOrganization(
  organizationId: string,
  membershipId: string,
) {
  return prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
}

function memberResponse(
  membership: Membership & {
    user: {
      createdAt: Date;
      email: string;
      id: string;
      name: string | null;
      status: UserStatus;
    };
  },
) {
  return {
    id: membership.id,
    role: membership.role,
    joinedAt: membership.createdAt,
    user: membership.user,
  };
}

export async function listMembers(membership: MemberMembership) {
  const members = await prisma.membership.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: [
      {
        role: "asc",
      },
      {
        user: {
          email: "asc",
        },
      },
    ],
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  return members.map(memberResponse);
}

export async function inviteMember(
  membership: MemberMembership,
  input: MemberInviteInput,
) {
  if (!canManageMembers(membership.role)) {
    throw new Error("You are not allowed to invite organization members.");
  }

  const user = await prisma.user.upsert({
    where: {
      email: input.email,
    },
    update: {
      name: input.name?.trim() || undefined,
    },
    create: {
      email: input.email,
      name: input.name?.trim() || null,
      passwordHash: "",
      status: UserStatus.INVITED,
    },
  });

  const invitedMembership = await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: membership.organizationId,
        userId: user.id,
      },
    },
    update: {
      role: input.role,
    },
    create: {
      organizationId: membership.organizationId,
      userId: user.id,
      role: input.role,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "member.invited",
    targetType: "Membership",
    targetId: invitedMembership.id,
    metadataJson: {
      email: user.email,
      role: invitedMembership.role,
      simulatedInvite: true,
    },
  });

  revalidatePath("/settings/members");

  return {
    member: memberResponse(invitedMembership),
    inviteLink: `/register?email=${encodeURIComponent(user.email)}`,
  };
}

export async function updateMemberRole(
  membership: MemberMembership,
  membershipId: string,
  input: MemberRoleUpdateInput,
) {
  if (!canManageMembers(membership.role)) {
    throw new Error("You are not allowed to manage organization members.");
  }

  const existing = await getMembershipInOrganization(
    membership.organizationId,
    membershipId,
  );

  if (!existing) {
    throw new Error("Member not found.");
  }

  if (
    existing.role === MembershipRole.org_owner &&
    input.role !== MembershipRole.org_owner &&
    (await countOrganizationOwners(membership.organizationId)) <= 1
  ) {
    throw new Error("Cannot remove the last organization owner.");
  }

  const updated = await prisma.membership.update({
    where: {
      id: existing.id,
      organizationId: membership.organizationId,
    },
    data: {
      role: input.role,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "member.role_changed",
    targetType: "Membership",
    targetId: updated.id,
    metadataJson: {
      email: updated.user.email,
      fromRole: existing.role,
      toRole: updated.role,
    },
  });

  revalidatePath("/settings/members");

  return memberResponse(updated);
}

export async function removeMember(
  membership: MemberMembership,
  membershipId: string,
) {
  if (!canManageMembers(membership.role)) {
    throw new Error("You are not allowed to remove organization members.");
  }

  const existing = await getMembershipInOrganization(
    membership.organizationId,
    membershipId,
  );

  if (!existing) {
    throw new Error("Member not found.");
  }

  if (
    existing.role === MembershipRole.org_owner &&
    (await countOrganizationOwners(membership.organizationId)) <= 1
  ) {
    throw new Error("Cannot remove the last organization owner.");
  }

  await prisma.membership.delete({
    where: {
      id: existing.id,
      organizationId: membership.organizationId,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "member.removed",
    targetType: "Membership",
    targetId: existing.id,
    metadataJson: {
      email: existing.user.email,
      role: existing.role,
      selfRemoval: existing.userId === membership.userId,
    },
  });

  revalidatePath("/settings/members");

  return {
    id: existing.id,
  };
}

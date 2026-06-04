import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import {
  OrganizationStatus,
  UserStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getCurrentUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      status: UserStatus.ACTIVE,
    },
    select: safeUserSelect,
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getMembershipForUser(userId: string) {
  return prisma.membership.findFirst({
    where: {
      userId,
      organization: {
        status: OrganizationStatus.ACTIVE,
      },
      user: {
        status: UserStatus.ACTIVE,
      },
    },
    include: {
      organization: true,
      user: {
        select: safeUserSelect,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getCurrentMembership() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return getMembershipForUser(user.id);
}

export async function requireMembership() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  return membership;
}

export async function getCurrentOrganizationId() {
  const membership = await getCurrentMembership();

  return membership?.organizationId ?? null;
}

export async function verifyPasswordCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      ...safeUserSelect,
      passwordHash: true,
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    return null;
  }

  const passwordMatches = await compare(password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

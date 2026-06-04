import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  ApiKeyStatus,
  MembershipRole,
  PrismaClient,
} from "../src/generated/prisma/client";

const DEMO_API_KEY = "ag_test_seed_support_refund_demo_key";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function hashApiKey(apiKey: string) {
  const pepper = process.env.API_KEY_PEPPER;

  if (!pepper) {
    throw new Error("API_KEY_PEPPER is required for security verification.");
  }

  return createHmac("sha256", pepper).update(apiKey).digest("hex");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for security verification.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  try {
    const [schema, sessionSource, organization] = await Promise.all([
      readFile("prisma/schema.prisma", "utf8"),
      readFile("src/lib/session.ts", "utf8"),
      prisma.organization.findUnique({
        where: { slug: "acme" },
        include: {
          apiKeys: true,
          memberships: true,
          policies: {
            include: {
              rules: true,
            },
          },
        },
      }),
    ]);

    assert(organization != null, "Expected seeded acme organization.");
    assert(
      !schema.includes("fullKey") && !schema.includes("plainTextKey"),
      "Prisma schema must not contain full/plaintext API key storage fields.",
    );
    assert(
      sessionSource.includes("httpOnly: true") &&
        sessionSource.includes('sameSite: "lax"') &&
        sessionSource.includes('secure: process.env.NODE_ENV === "production"'),
      "Session cookie security flags are missing.",
    );

    const apiKeys = organization.apiKeys;
    assert(apiKeys.length > 0, "Expected seeded API keys.");
    assert(
      apiKeys.every((apiKey) => !apiKey.keyHash.startsWith("ag_test_")),
      "API key hashes must not contain full API key prefixes.",
    );
    assert(
      apiKeys.every((apiKey) => apiKey.keyHash !== DEMO_API_KEY),
      "API key hash must not equal the demo full key.",
    );

    const demoHash = hashApiKey(DEMO_API_KEY);
    const demoKey = apiKeys.find((apiKey) => apiKey.keyHash === demoHash);

    assert(demoKey != null, "Seeded demo API key hash was not found.");
    assert(demoKey.status === ApiKeyStatus.ACTIVE, "Seeded demo API key must be active.");
    assert(demoKey.agentId == null, "Seeded demo API key should be organization-scoped.");
    assert(
      demoKey.keyPrefix === "ag_test_seed",
      `Unexpected seeded key prefix: ${demoKey.keyPrefix}`,
    );

    const roles = new Set(organization.memberships.map((membership) => membership.role));
    [
      MembershipRole.org_owner,
      MembershipRole.security_admin,
      MembershipRole.developer,
      MembershipRole.reviewer,
      MembershipRole.auditor,
    ].forEach((role) => assert(roles.has(role), `Missing seeded role ${role}.`));

    const refundPolicy = organization.policies.find((policy) =>
      policy.name.toLowerCase().includes("refunds above $500"),
    );

    assert(refundPolicy != null, "Expected seeded refund policy.");
    assert(refundPolicy.rules.length > 0, "Expected seeded refund policy rules.");

    const mismatchedApproval = await prisma.approvalRequest.findFirst({
      where: {
        organizationId: organization.id,
        actionRequest: {
          organizationId: {
            not: organization.id,
          },
        },
      },
      select: { id: true },
    });

    assert(!mismatchedApproval, "Found approval/action organization mismatch.");

    console.log("Security basics verification passed.");
    console.log({
      apiKeysChecked: apiKeys.length,
      organization: organization.slug,
      policiesChecked: organization.policies.length,
      roles: Array.from(roles).sort(),
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

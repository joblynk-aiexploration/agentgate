import { NextResponse } from "next/server";
import {
  createApiKey,
  getApiKeyCreatorMembership,
  getApiKeyViewerMembership,
} from "@/lib/api-keys";
import { prisma } from "@/lib/prisma";
import { apiKeyCreateSchema } from "@/lib/validators";

export async function GET() {
  const membership = await getApiKeyViewerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ apiKeys });
}

export async function POST(request: Request) {
  const membership = await getApiKeyCreatorMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = apiKeyCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await createApiKey(membership, parsed.data);

    return NextResponse.json(
      {
        apiKey: result.apiKey,
        fullKey: result.fullKey,
        message: "The full API key is shown once. Copy it now.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("API key creation failed", error);

    return NextResponse.json(
      { error: "API key creation failed." },
      { status: 400 },
    );
  }
}

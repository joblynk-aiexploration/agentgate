import { NextResponse } from "next/server";
import {
  getApiKeyRevokerMembership,
  revokeApiKey,
} from "@/lib/api-keys";

type ApiKeyRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: ApiKeyRouteContext) {
  const membership = await getApiKeyRevokerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const apiKey = await revokeApiKey(membership, id);

    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error("API key revocation failed", error);

    return NextResponse.json(
      { error: "API key revocation failed." },
      { status: 404 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPolicyFromTemplate,
  getApiPolicyManagerMembership,
} from "@/lib/policies";
import { policyInputSchema } from "@/lib/validators";
import {
  getPolicyTemplate,
  policyTemplateIdValues,
} from "@/server/policies/templates";

const policyFromTemplateSchema = z.object({
  templateId: z.enum(policyTemplateIdValues),
  policy: policyInputSchema,
});

export async function POST(request: Request) {
  const membership = await getApiPolicyManagerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = policyFromTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const template = getPolicyTemplate(parsed.data.templateId);

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  try {
    const policy = await createPolicyFromTemplate(
      membership,
      template.id,
      parsed.data.policy,
    );

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error("Policy template creation failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      { error: "Policy template creation failed." },
      { status: 400 },
    );
  }
}

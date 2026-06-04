import { z } from "zod";
import {
  AgentRiskTier,
  AgentStatus,
  ToolType,
} from "@/generated/prisma/client";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name is required.")
    .max(80, "Organization name is too long."),
  name: z
    .string()
    .trim()
    .min(2, "Name is required.")
    .max(80, "Name is too long."),
  email: emailSchema,
  password: passwordSchema,
});

export function slugifyOrganizationName(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return slug || "organization";
}

export function slugifyAgentName(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return slug || "agent";
}

const agentStatusValues = Object.values(AgentStatus) as [
  AgentStatus,
  ...AgentStatus[],
];
const agentRiskTierValues = Object.values(AgentRiskTier) as [
  AgentRiskTier,
  ...AgentRiskTier[],
];
const toolTypeValues = Object.values(ToolType) as [ToolType, ...ToolType[]];

export const agentInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  description: z.string().trim().max(1000).optional().nullable(),
  department: z.string().trim().max(80).optional().nullable(),
  ownerUserId: z.string().trim().optional().nullable(),
  status: z.enum(agentStatusValues),
  riskTier: z.enum(agentRiskTierValues),
  allowedTools: z.array(z.enum(toolTypeValues)).min(1, "Select at least one tool."),
});

export const agentPatchSchema = agentInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export function parseAgentFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") || slugifyAgentName(name));

  return agentInputSchema.parse({
    name,
    slug,
    description: formData.get("description") || null,
    department: formData.get("department") || null,
    ownerUserId: formData.get("ownerUserId") || null,
    status: formData.get("status"),
    riskTier: formData.get("riskTier"),
    allowedTools: formData.getAll("allowedTools"),
  });
}

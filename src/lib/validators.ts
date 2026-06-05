import { z } from "zod";
import {
  ActionDecision,
  ActionStatus,
  ApprovalStatus,
  AgentRiskTier,
  AgentStatus,
  MembershipRole,
  PolicyStatus,
  RiskLevel,
  ToolType,
  WebhookEndpointStatus,
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
  name: z
    .string()
    .trim()
    .min(2, "Name is required.")
    .max(80, "Name is too long."),
  email: emailSchema,
  password: passwordSchema,
});

export const organizationOnboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name is required.")
    .max(80, "Organization name is too long."),
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
const policyStatusValues = Object.values(PolicyStatus) as [
  PolicyStatus,
  ...PolicyStatus[],
];
const actionStatusValues = Object.values(ActionStatus) as [
  ActionStatus,
  ...ActionStatus[],
];
const actionDecisionValues = Object.values(ActionDecision) as [
  ActionDecision,
  ...ActionDecision[],
];
const approvalStatusValues = Object.values(ApprovalStatus) as [
  ApprovalStatus,
  ...ApprovalStatus[],
];
const membershipRoleValues = Object.values(MembershipRole) as [
  MembershipRole,
  ...MembershipRole[],
];
const riskLevelValues = Object.values(RiskLevel) as [RiskLevel, ...RiskLevel[]];
const webhookEndpointStatusValues = Object.values(WebhookEndpointStatus) as [
  WebhookEndpointStatus,
  ...WebhookEndpointStatus[],
];

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

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

function parseOptionalDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);

  return Number.isNaN(date.getTime()) ? null : date;
}

export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  agentId: z.string().trim().optional().nullable(),
  expiresAt: z.preprocess(parseOptionalDate, z.date().nullable()),
});

export function parseApiKeyFormData(formData: FormData) {
  return apiKeyCreateSchema.parse({
    name: formData.get("name"),
    agentId: formData.get("agentId") || null,
    expiresAt: formData.get("expiresAt") || null,
  });
}

export const policyRuleInputSchema = z.object({
  tool: z.enum(toolTypeValues).optional().nullable(),
  action: z.string().trim().max(160).optional().nullable(),
  decision: z.enum(actionDecisionValues),
  requiredRole: z.enum(membershipRoleValues).optional().nullable(),
  riskOverride: z.enum(riskLevelValues).optional().nullable(),
  conditionsJson: z
    .record(z.string(), jsonValueSchema)
    .default({})
    .refine(
      (value) => {
        try {
          JSON.stringify(value);
          return true;
        } catch {
          return false;
        }
      },
      "Conditions must be valid JSON.",
    ),
});

export const policyInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1200).optional().nullable(),
  status: z.enum(policyStatusValues),
  priority: z.coerce.number().int().min(1).max(10_000),
  rules: z
    .array(policyRuleInputSchema)
    .min(1, "Add at least one rule.")
    .max(20, "A V1 policy can have up to 20 rules."),
});

export const policyPatchSchema = policyInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export const approvalListQuerySchema = z.object({
  status: z.enum(approvalStatusValues).optional(),
  riskLevel: z.enum(riskLevelValues).optional(),
  tool: z.enum(toolTypeValues).optional(),
  agentId: z.string().trim().optional(),
  date: z.string().trim().optional(),
  assignedToMe: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const approvalReviewSchema = z.object({
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const approvalEditSchema = z.object({
  editedPayloadJson: jsonValueSchema,
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const approvalCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment is required.").max(2000),
});

const optionalFilterString = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => value || undefined);

export const actionListQuerySchema = z.object({
  status: z.enum(actionStatusValues).optional(),
  decision: z.enum(actionDecisionValues).optional(),
  riskLevel: z.enum(riskLevelValues).optional(),
  tool: z.enum(toolTypeValues).optional(),
  agentId: optionalFilterString,
  from: optionalFilterString,
  to: optionalFilterString,
  environment: optionalFilterString,
});

export const auditLogQuerySchema = z.object({
  eventType: optionalFilterString,
  actorType: optionalFilterString,
  targetType: optionalFilterString,
  from: optionalFilterString,
  to: optionalFilterString,
  search: optionalFilterString,
});

export const settingsUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  aiReviewerMode: z
    .enum(["DISABLED", "LOCAL_RULES_ONLY", "LOCAL_MODEL", "PREMIUM_MODEL"])
    .optional(),
});

export const memberInviteSchema = z.object({
  email: emailSchema,
  name: z.string().trim().max(80).optional().nullable(),
  role: z.enum(membershipRoleValues).refine(
    (role) => role !== MembershipRole.platform_owner,
    "Platform owner cannot be assigned from organization settings.",
  ),
});

export const memberRoleUpdateSchema = z.object({
  role: z.enum(membershipRoleValues).refine(
    (role) => role !== MembershipRole.platform_owner,
    "Platform owner cannot be assigned from organization settings.",
  ),
});

export const notificationIdSchema = z.string().trim().min(1).max(160);

export const outboundWebhookEventValues = [
  "gateway.action_checked",
  "action.blocked",
  "approval.requested",
  "approval.approved",
  "approval.rejected",
  "action.executed",
  "agent.paused",
  "organization.kill_switch_enabled",
] as const;

const webhookEventsSchema = z
  .array(z.enum(outboundWebhookEventValues))
  .min(1, "Select at least one event.")
  .max(outboundWebhookEventValues.length);

const webhookUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid webhook URL.")
  .refine((value) => {
    const url = new URL(value);

    return url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
  }, "Use HTTPS URLs, except localhost is allowed for local demos.");

export const webhookEndpointInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  url: webhookUrlSchema,
  secret: z.string().trim().min(12).max(200).optional().nullable(),
  status: z.enum(webhookEndpointStatusValues).default(WebhookEndpointStatus.ACTIVE),
  events: webhookEventsSchema,
});

export const webhookEndpointPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    url: webhookUrlSchema.optional(),
    secret: z.string().trim().min(12).max(200).optional().nullable(),
    status: z.enum(webhookEndpointStatusValues).optional(),
    events: webhookEventsSchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required.",
  );

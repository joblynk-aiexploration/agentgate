import { MembershipRole } from "@/generated/prisma/client";

export type RbacCapabilityId =
  | "view_dashboard"
  | "manage_members"
  | "manage_agents"
  | "pause_agents"
  | "manage_policies"
  | "view_approvals"
  | "approve_approvals"
  | "reject_approvals"
  | "edit_approval_payload"
  | "view_audit_logs"
  | "export_audit_logs"
  | "manage_api_keys"
  | "revoke_api_keys"
  | "manage_webhooks"
  | "manage_settings"
  | "toggle_kill_switch"
  | "view_billing"
  | "manage_billing";

export type RbacCapability = {
  id: RbacCapabilityId;
  label: string;
  description: string;
};

export const rbacRoles = [
  MembershipRole.org_owner,
  MembershipRole.security_admin,
  MembershipRole.developer,
  MembershipRole.reviewer,
  MembershipRole.auditor,
  MembershipRole.platform_owner,
] as const;

export const rbacCapabilities: RbacCapability[] = [
  {
    id: "view_dashboard",
    label: "View dashboard",
    description: "View organization summary metrics and recent activity.",
  },
  {
    id: "manage_members",
    label: "Manage members",
    description: "Invite members, change roles, and remove organization members.",
  },
  {
    id: "manage_agents",
    label: "Manage agents",
    description: "Create, edit, and delete organization agents.",
  },
  {
    id: "pause_agents",
    label: "Pause agents",
    description: "Pause or resume agents so gateway requests block or resume.",
  },
  {
    id: "manage_policies",
    label: "Manage policies",
    description: "Create, edit, delete, and template policies.",
  },
  {
    id: "view_approvals",
    label: "View approvals",
    description: "View Approval Inbox requests and approval detail pages.",
  },
  {
    id: "approve_approvals",
    label: "Approve approvals",
    description: "Approve assigned or role-eligible approvals.",
  },
  {
    id: "reject_approvals",
    label: "Reject approvals",
    description: "Reject assigned or role-eligible approvals.",
  },
  {
    id: "edit_approval_payload",
    label: "Edit approval payload",
    description: "Save edited payload JSON for eligible pending approvals.",
  },
  {
    id: "view_audit_logs",
    label: "View audit logs",
    description: "View organization-scoped audit logs.",
  },
  {
    id: "export_audit_logs",
    label: "Export audit logs",
    description: "Export organization-scoped audit logs as CSV.",
  },
  {
    id: "manage_api_keys",
    label: "Manage API keys",
    description: "Create agent/developer API keys. Full keys are shown once.",
  },
  {
    id: "revoke_api_keys",
    label: "Revoke API keys",
    description: "Revoke existing API keys.",
  },
  {
    id: "manage_webhooks",
    label: "Manage webhooks",
    description: "Create, update, test, delete, or disable outbound webhooks.",
  },
  {
    id: "manage_settings",
    label: "Manage settings",
    description: "Update organization profile and V1 safety settings.",
  },
  {
    id: "toggle_kill_switch",
    label: "Toggle kill switch",
    description: "Enable or disable the organization kill switch.",
  },
  {
    id: "view_billing",
    label: "View billing",
    description: "View display-only billing and plan information.",
  },
  {
    id: "manage_billing",
    label: "Manage billing placeholder",
    description: "Reserved for future billing administration.",
  },
];

export const rbacMatrix: Record<MembershipRole, RbacCapabilityId[]> = {
  [MembershipRole.org_owner]: [
    "view_dashboard",
    "manage_members",
    "manage_agents",
    "pause_agents",
    "manage_policies",
    "view_approvals",
    "approve_approvals",
    "reject_approvals",
    "edit_approval_payload",
    "view_audit_logs",
    "export_audit_logs",
    "manage_api_keys",
    "revoke_api_keys",
    "manage_webhooks",
    "manage_settings",
    "toggle_kill_switch",
    "view_billing",
    "manage_billing",
  ],
  [MembershipRole.security_admin]: [
    "view_dashboard",
    "manage_agents",
    "pause_agents",
    "manage_policies",
    "view_approvals",
    "approve_approvals",
    "reject_approvals",
    "edit_approval_payload",
    "view_audit_logs",
    "export_audit_logs",
    "revoke_api_keys",
    "manage_webhooks",
    "toggle_kill_switch",
    "view_billing",
  ],
  [MembershipRole.developer]: [
    "view_dashboard",
    "manage_api_keys",
    "revoke_api_keys",
    "manage_webhooks",
    "view_billing",
  ],
  [MembershipRole.reviewer]: [
    "view_dashboard",
    "view_approvals",
    "approve_approvals",
    "reject_approvals",
    "edit_approval_payload",
    "view_billing",
  ],
  [MembershipRole.auditor]: [
    "view_dashboard",
    "view_audit_logs",
    "export_audit_logs",
    "view_billing",
  ],
  [MembershipRole.platform_owner]: [
    "view_dashboard",
    "manage_members",
    "manage_agents",
    "pause_agents",
    "manage_policies",
    "view_approvals",
    "approve_approvals",
    "reject_approvals",
    "edit_approval_payload",
    "view_audit_logs",
    "export_audit_logs",
    "manage_api_keys",
    "revoke_api_keys",
    "manage_webhooks",
    "manage_settings",
    "toggle_kill_switch",
    "view_billing",
    "manage_billing",
  ],
};

export function hasCapability(
  role: MembershipRole,
  capability: RbacCapabilityId,
) {
  return rbacMatrix[role].includes(capability);
}

export function rolesForCapability(capability: RbacCapabilityId) {
  return rbacRoles.filter((role) => hasCapability(role, capability));
}

import {
  ActionDecision,
  AgentStatus,
  OrganizationStatus,
  PolicyStatus,
  RiskLevel,
  ToolConnectionStatus,
} from "@/generated/prisma/client";
import { policyRuleMatchesContext } from "@/server/policies/conditions";
import type {
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyForEvaluation,
  PolicyRuleForEvaluation,
} from "@/server/policies/types";

const restrictiveWeight: Record<ActionDecision, number> = {
  [ActionDecision.ALLOW]: 1,
  [ActionDecision.LOG_ONLY]: 2,
  [ActionDecision.SANDBOX_ONLY]: 3,
  [ActionDecision.REQUIRE_APPROVAL]: 4,
  [ActionDecision.BLOCK]: 5,
};

function isActiveOrganizationStatus(status: string) {
  return status === OrganizationStatus.ACTIVE;
}

function isPausedOrganization(status: string) {
  return status === OrganizationStatus.PAUSED;
}

function isAgentBlocked(status: string) {
  const blockedStatuses: AgentStatus[] = [
    AgentStatus.PAUSED,
    AgentStatus.LOCKED,
    AgentStatus.DISABLED,
  ];

  return blockedStatuses.includes(status as AgentStatus);
}

function isToolConnectionBlocked(status: string) {
  const blockedStatuses: ToolConnectionStatus[] = [
    ToolConnectionStatus.DISCONNECTED,
    ToolConnectionStatus.ERROR,
    ToolConnectionStatus.DISABLED,
  ];

  return blockedStatuses.includes(status as ToolConnectionStatus);
}

function resultFromDecision(input: {
  decision: ActionDecision;
  matchedPolicyId?: string;
  matchedPolicyRuleId?: string;
  policyReasons: string[];
  reason: string;
  requiredRole?: PolicyEvaluationResult["requiredRole"];
}): PolicyEvaluationResult {
  return {
    decision: input.decision,
    allowed: input.decision !== ActionDecision.BLOCK,
    requiresApproval: input.decision === ActionDecision.REQUIRE_APPROVAL,
    requiredRole: input.requiredRole,
    matchedPolicyId: input.matchedPolicyId,
    matchedPolicyRuleId: input.matchedPolicyRuleId,
    reason: input.reason,
    policyReasons: input.policyReasons,
  };
}

function shouldRiskRequireApproval(riskLevel: RiskLevel) {
  return riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL;
}

function chooseMoreRestrictive(current: MatchedDecision, candidate: MatchedDecision) {
  if (restrictiveWeight[candidate.decision] > restrictiveWeight[current.decision]) {
    return candidate;
  }

  if (
    restrictiveWeight[candidate.decision] === restrictiveWeight[current.decision] &&
    !current.matchedPolicyRuleId &&
    candidate.matchedPolicyRuleId
  ) {
    return candidate;
  }

  return current;
}

type MatchedDecision = {
  decision: ActionDecision;
  matchedPolicyId?: string;
  matchedPolicyRuleId?: string;
  policyReasons: string[];
  reason: string;
  requiredRole?: PolicyEvaluationResult["requiredRole"];
};

export class PolicyEngine {
  async evaluate(input: PolicyEvaluationInput): Promise<PolicyEvaluationResult> {
    if (
      input.organization.killSwitchEnabled ||
      isPausedOrganization(input.organization.status)
    ) {
      return resultFromDecision({
        decision: ActionDecision.BLOCK,
        reason: "Organization-level kill switch is active.",
        policyReasons: ["Organization-level kill switch is active."],
      });
    }

    if (!isActiveOrganizationStatus(input.organization.status)) {
      return resultFromDecision({
        decision: ActionDecision.BLOCK,
        reason: `Organization status is ${input.organization.status}.`,
        policyReasons: [`Organization status is ${input.organization.status}.`],
      });
    }

    if (isAgentBlocked(input.agent.status)) {
      return resultFromDecision({
        decision: ActionDecision.BLOCK,
        reason: "Agent is paused by admin kill switch.",
        policyReasons: ["Agent is paused by admin kill switch."],
      });
    }

    if (
      input.toolConnection &&
      isToolConnectionBlocked(input.toolConnection.status)
    ) {
      return resultFromDecision({
        decision: ActionDecision.BLOCK,
        reason: `Tool connection is ${input.toolConnection.status}.`,
        policyReasons: [`Tool connection is ${input.toolConnection.status}.`],
      });
    }

    const policies =
      input.policies ?? (await this.loadActivePolicies(input.organization.id));
    const matchedPolicyDecision = this.evaluatePolicies(policies, input);
    const finalDecision = this.combineWithRisk(matchedPolicyDecision, input);

    return resultFromDecision(finalDecision);
  }

  private async loadActivePolicies(organizationId: string): Promise<PolicyForEvaluation[]> {
    const { prisma } = await import("@/lib/prisma");
    const policies = await prisma.policy.findMany({
      where: {
        organizationId,
        status: PolicyStatus.ACTIVE,
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        rules: {
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            policyId: true,
            tool: true,
            action: true,
            conditionsJson: true,
            decision: true,
            requiredRole: true,
            riskOverride: true,
          },
        },
      },
    });

    return policies;
  }

  private evaluatePolicies(
    policies: PolicyForEvaluation[],
    input: PolicyEvaluationInput,
  ): MatchedDecision {
    let matched: MatchedDecision = {
      decision: ActionDecision.ALLOW,
      reason: "No blocking or approval policy matched.",
      policyReasons: ["Default allow because no restrictive active policy matched."],
    };

    const activePolicies = policies
      .filter((policy) => policy.status === PolicyStatus.ACTIVE)
      .sort((left, right) => left.priority - right.priority);

    for (const policy of activePolicies) {
      for (const rule of policy.rules) {
        if (!policyRuleMatchesContext(rule, input)) {
          continue;
        }

        const candidate = this.buildMatchedDecision(policy, rule);
        matched = chooseMoreRestrictive(matched, candidate);
      }
    }

    return matched;
  }

  private buildMatchedDecision(
    policy: PolicyForEvaluation,
    rule: PolicyRuleForEvaluation,
  ): MatchedDecision {
    const reason = `${policy.name}: ${rule.decision}.`;

    return {
      decision: rule.decision,
      matchedPolicyId: policy.id,
      matchedPolicyRuleId: rule.id,
      policyReasons: [reason],
      reason,
      requiredRole: rule.requiredRole ?? undefined,
    };
  }

  private combineWithRisk(
    matchedPolicyDecision: MatchedDecision,
    input: PolicyEvaluationInput,
  ): MatchedDecision {
    const riskResult = input.riskResult;

    if (!riskResult || !shouldRiskRequireApproval(riskResult.level)) {
      return matchedPolicyDecision;
    }

    const riskDecision: MatchedDecision = {
      decision: ActionDecision.REQUIRE_APPROVAL,
      reason: `Risk engine requires approval for ${riskResult.level} risk.`,
      policyReasons: [
        ...matchedPolicyDecision.policyReasons,
        `Risk engine requires approval for ${riskResult.level} risk.`,
      ],
    };

    const combined = chooseMoreRestrictive(matchedPolicyDecision, riskDecision);

    if (combined === matchedPolicyDecision) {
      return {
        ...matchedPolicyDecision,
        policyReasons: [
          ...matchedPolicyDecision.policyReasons,
          `Risk engine assessed ${riskResult.level} risk.`,
        ],
      };
    }

    return combined;
  }
}

export const policyEngine = new PolicyEngine();

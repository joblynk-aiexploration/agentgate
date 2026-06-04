import {
  ActionDecision,
  ActionStatus,
  ApiKeyStatus,
  ApprovalStatus,
  RiskLevel,
} from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { createAuditLog } from "@/lib/audit";
import { hashApiKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIp } from "@/server/gateway/idempotency";
import type {
  GatewayActionRequest,
  GatewayCancelResponse,
  GatewayCheckRequest,
  GatewayDecisionResponse,
  GatewayExecutionResponse,
} from "@/server/gateway/types";
import { policyEngine } from "@/server/policies/policy-engine";
import { localRiskEngine } from "@/server/risk/risk-engine";

export class GatewayError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function getBearerToken(headers: Headers) {
  const authorization = headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new GatewayError(401, "Missing or invalid authorization header.");
  }

  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new GatewayError(401, "Missing API key.");
  }

  return token;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function amountToCents(amount: number | null | undefined) {
  return amount == null ? null : Math.round(amount * 100);
}

function isProductionEnvironment(input: GatewayCheckRequest) {
  return (
    input.productionEnvironment === true ||
    input.environment.toLowerCase() === "production"
  );
}

function isExternalCommunication(input: GatewayCheckRequest) {
  if (input.externalCommunication != null) {
    return input.externalCommunication;
  }

  const searchable = JSON.stringify({
    action: input.action,
    payload: input.payload,
    metadata: input.metadata,
    reason: input.reason,
  }).toLowerCase();

  return searchable.includes("customer") || searchable.includes("external");
}

function buildEvaluationPayload(input: GatewayCheckRequest) {
  return {
    ...input.payload,
    amount: input.amount ?? null,
    amountCents: amountToCents(input.amount),
    currency: input.currency ?? null,
  };
}

function mapDecisionToStatus(
  decision: ActionDecision,
  input: GatewayCheckRequest,
) {
  if (decision === ActionDecision.BLOCK) {
    return {
      allowed: false,
      requiresApproval: false,
      status: ActionStatus.BLOCKED,
    };
  }

  if (decision === ActionDecision.REQUIRE_APPROVAL) {
    return {
      allowed: false,
      requiresApproval: true,
      status: ActionStatus.PENDING_APPROVAL,
    };
  }

  if (decision === ActionDecision.SANDBOX_ONLY) {
    const allowed = !isProductionEnvironment(input);

    return {
      allowed,
      requiresApproval: false,
      status: allowed ? ActionStatus.ALLOWED : ActionStatus.BLOCKED,
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    status: ActionStatus.ALLOWED,
  };
}

function responseFromActionRequest(actionRequest: {
  id: string;
  decision: ActionDecision;
  reason: string;
  status: ActionStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  approvalRequest?: { id: string } | null;
  riskAssessments?: {
    score: number;
    level: RiskLevel;
    signalsJson: Prisma.JsonValue;
    explanation: string;
  }[];
}): GatewayDecisionResponse {
  const riskAssessment = actionRequest.riskAssessments?.at(0);
  const signals = Array.isArray(riskAssessment?.signalsJson)
    ? riskAssessment.signalsJson.filter(
        (signal): signal is string => typeof signal === "string",
      )
    : [];

  return {
    actionRequestId: actionRequest.id,
    decision: actionRequest.decision,
    allowed:
      actionRequest.status === ActionStatus.ALLOWED ||
      actionRequest.status === ActionStatus.APPROVED ||
      actionRequest.status === ActionStatus.EXECUTED,
    requiresApproval: actionRequest.requiresApproval,
    approvalRequestId: actionRequest.approvalRequest?.id,
    risk: {
      score: riskAssessment?.score ?? actionRequest.riskScore,
      level: riskAssessment?.level ?? actionRequest.riskLevel,
      signals,
      explanation: riskAssessment?.explanation ?? actionRequest.reason,
    },
    reason: actionRequest.reason,
    status: actionRequest.status,
  };
}

export class GatewayService {
  async check(
    input: GatewayCheckRequest,
    headers: Headers,
    idempotencyKey?: string | null,
  ): Promise<GatewayDecisionResponse> {
    const auth = await this.authenticate(headers);

    if (idempotencyKey) {
      const existing = await this.findIdempotentAction(
        auth.apiKey.organizationId,
        idempotencyKey,
      );

      if (existing) {
        return responseFromActionRequest(existing);
      }
    }

    const agent = await prisma.agent.findFirst({
      where: {
        organizationId: auth.apiKey.organizationId,
        OR: [{ id: input.agentId }, { slug: input.agentId }],
      },
      include: {
        organization: true,
      },
    });

    if (!agent) {
      throw new GatewayError(404, "Agent not found.");
    }

    if (auth.apiKey.agentId && auth.apiKey.agentId !== agent.id) {
      throw new GatewayError(403, "API key is not scoped to this agent.");
    }

    const [toolConnection] = await Promise.all([
      prisma.toolConnection.findFirst({
        where: {
          organizationId: auth.apiKey.organizationId,
          toolType: input.tool,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prisma.apiKey.update({
        where: {
          id: auth.apiKey.id,
          organizationId: auth.apiKey.organizationId,
        },
        data: {
          lastUsedAt: new Date(),
        },
      }),
    ]);

    const evaluationPayload = buildEvaluationPayload(input);
    const riskResult = await localRiskEngine.assess({
      organization: agent.organization,
      agent,
      tool: input.tool,
      action: input.action,
      environment: input.environment,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      reason: input.reason ?? null,
      payload: evaluationPayload,
      metadata: input.metadata,
      dataSensitivity: input.dataSensitivity ?? null,
      reversible: input.reversible ?? null,
      externalCommunication: isExternalCommunication(input),
      productionEnvironment: isProductionEnvironment(input),
    });

    const policyResult = await policyEngine.evaluate({
      organization: agent.organization,
      agent,
      toolConnection,
      tool: input.tool,
      action: input.action,
      environment: input.environment,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      customerTier:
        typeof input.metadata.customerTier === "string"
          ? input.metadata.customerTier
          : null,
      dataSensitivity: input.dataSensitivity ?? null,
      reversible: input.reversible ?? null,
      externalCommunication: isExternalCommunication(input),
      productionEnvironment: isProductionEnvironment(input),
      payload: evaluationPayload,
      metadata: input.metadata,
      riskResult,
    });

    const decisionState = mapDecisionToStatus(policyResult.decision, input);
    const reason =
      policyResult.decision === ActionDecision.SANDBOX_ONLY &&
      decisionState.status === ActionStatus.BLOCKED
        ? `${policyResult.reason} Sandbox-only actions are blocked in production in V1.`
        : policyResult.reason;

    const actionRequest = await prisma.$transaction(async (tx) => {
      const createdAction = await tx.actionRequest.create({
        data: {
          organizationId: auth.apiKey.organizationId,
          agentId: agent.id,
          apiKeyId: auth.apiKey.id,
          tool: input.tool,
          action: input.action,
          environment: input.environment,
          payloadJson: toJsonValue(evaluationPayload),
          metadataJson: toJsonValue(input.metadata),
          riskScore: riskResult.score,
          riskLevel: riskResult.level,
          decision: policyResult.decision,
          status: decisionState.status,
          requiresApproval: decisionState.requiresApproval,
          policyMatchedId: policyResult.matchedPolicyId,
          reason,
          idempotencyKey: idempotencyKey ?? null,
        },
      });

      await tx.riskAssessment.create({
        data: {
          organizationId: auth.apiKey.organizationId,
          actionRequestId: createdAction.id,
          score: riskResult.score,
          level: riskResult.level,
          signalsJson: toJsonValue(riskResult.signals),
          explanation: riskResult.explanation,
          modelVersion: riskResult.modelVersion,
        },
      });

      let approvalRequestId: string | undefined;

      if (decisionState.requiresApproval) {
        const approval = await tx.approvalRequest.create({
          data: {
            organizationId: auth.apiKey.organizationId,
            actionRequestId: createdAction.id,
            status: ApprovalStatus.PENDING,
            requiredRole: policyResult.requiredRole,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          select: { id: true },
        });

        approvalRequestId = approval.id;
      }

      return {
        ...createdAction,
        approvalRequest: approvalRequestId ? { id: approvalRequestId } : null,
        riskAssessments: [
          {
            score: riskResult.score,
            level: riskResult.level,
            signalsJson: riskResult.signals,
            explanation: riskResult.explanation,
          },
        ],
      };
    });

    await createAuditLog({
      organizationId: auth.apiKey.organizationId,
      actorType: "agent",
      actorId: agent.id,
      eventType: "gateway.action_checked",
      targetType: "ActionRequest",
      targetId: actionRequest.id,
      metadataJson: {
        apiKeyId: auth.apiKey.id,
        decision: actionRequest.decision,
        status: actionRequest.status,
        riskLevel: actionRequest.riskLevel,
        policyReasons: policyResult.policyReasons,
      },
    });

    if (actionRequest.status === ActionStatus.BLOCKED) {
      await createAuditLog({
        organizationId: auth.apiKey.organizationId,
        actorType: "agent",
        actorId: agent.id,
        eventType: "action.blocked",
        targetType: "ActionRequest",
        targetId: actionRequest.id,
        metadataJson: {
          decision: actionRequest.decision,
          reason: actionRequest.reason,
          riskLevel: actionRequest.riskLevel,
        },
      });
    }

    return responseFromActionRequest(actionRequest);
  }

  async execute(
    input: GatewayActionRequest,
    headers: Headers,
  ): Promise<GatewayExecutionResponse> {
    const auth = await this.authenticate(headers);
    const actionRequest = await this.getActionRequestForApiKey(
      auth.apiKey.organizationId,
      auth.apiKey.agentId,
      input.actionRequestId,
    );

    if (
      actionRequest.status !== ActionStatus.ALLOWED &&
      actionRequest.status !== ActionStatus.APPROVED
    ) {
      throw new GatewayError(400, "Action is not approved for execution.");
    }

    const updated = await prisma.actionRequest.update({
      where: {
        id: actionRequest.id,
        organizationId: auth.apiKey.organizationId,
      },
      data: {
        status: ActionStatus.EXECUTED,
      },
      select: {
        id: true,
        status: true,
        agentId: true,
      },
    });

    await createAuditLog({
      organizationId: auth.apiKey.organizationId,
      actorType: "agent",
      actorId: updated.agentId,
      eventType: "gateway.action_executed",
      targetType: "ActionRequest",
      targetId: updated.id,
      metadataJson: {
        simulated: true,
        apiKeyId: auth.apiKey.id,
      },
    });

    return {
      actionRequestId: updated.id,
      status: updated.status,
      executed: true,
      result: {
        simulated: true,
        message: "V1 simulated execution only. No external action was performed.",
      },
    };
  }

  async cancel(
    input: GatewayActionRequest,
    headers: Headers,
  ): Promise<GatewayCancelResponse> {
    const auth = await this.authenticate(headers);
    const actionRequest = await this.getActionRequestForApiKey(
      auth.apiKey.organizationId,
      auth.apiKey.agentId,
      input.actionRequestId,
    );

    const cancellableStatuses: ActionStatus[] = [
      ActionStatus.REQUESTED,
      ActionStatus.PENDING_APPROVAL,
    ];

    if (!cancellableStatuses.includes(actionRequest.status)) {
      throw new GatewayError(400, "Action cannot be cancelled.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const action = await tx.actionRequest.update({
        where: {
          id: actionRequest.id,
          organizationId: auth.apiKey.organizationId,
        },
        data: {
          status: ActionStatus.CANCELLED,
        },
        select: {
          id: true,
          status: true,
          agentId: true,
        },
      });

      await tx.approvalRequest.updateMany({
        where: {
          organizationId: auth.apiKey.organizationId,
          actionRequestId: actionRequest.id,
          status: ApprovalStatus.PENDING,
        },
        data: {
          status: ApprovalStatus.CANCELLED,
        },
      });

      return action;
    });

    await createAuditLog({
      organizationId: auth.apiKey.organizationId,
      actorType: "agent",
      actorId: updated.agentId,
      eventType: "gateway.action_cancelled",
      targetType: "ActionRequest",
      targetId: updated.id,
      metadataJson: {
        apiKeyId: auth.apiKey.id,
      },
    });

    return {
      actionRequestId: updated.id,
      status: updated.status,
      cancelled: true,
    };
  }

  private async authenticate(headers: Headers) {
    const token = getBearerToken(headers);
    const keyHash = hashApiKey(token);
    const ip = getRequestIp(headers);
    const rateLimit = checkRateLimit(keyHash || ip);

    if (!rateLimit.allowed) {
      throw new GatewayError(429, "Rate limit exceeded.");
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        status: ApiKeyStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        organizationId: true,
        agentId: true,
        organization: {
          select: {
            id: true,
            status: true,
            killSwitchEnabled: true,
          },
        },
      },
    });

    if (!apiKey) {
      throw new GatewayError(401, "Invalid API key.");
    }

    return { apiKey, keyHash };
  }

  private async findIdempotentAction(
    organizationId: string,
    idempotencyKey: string,
  ) {
    return prisma.actionRequest.findFirst({
      where: {
        organizationId,
        idempotencyKey,
      },
      select: {
        id: true,
        decision: true,
        reason: true,
        status: true,
        riskScore: true,
        riskLevel: true,
        requiresApproval: true,
        approvalRequest: {
          select: {
            id: true,
          },
        },
        riskAssessments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            score: true,
            level: true,
            signalsJson: true,
            explanation: true,
          },
        },
      },
    });
  }

  private async getActionRequestForApiKey(
    organizationId: string,
    scopedAgentId: string | null,
    actionRequestId: string,
  ) {
    const actionRequest = await prisma.actionRequest.findFirst({
      where: {
        id: actionRequestId,
        organizationId,
      },
      select: {
        id: true,
        agentId: true,
        status: true,
      },
    });

    if (!actionRequest) {
      throw new GatewayError(404, "Action request not found.");
    }

    if (scopedAgentId && scopedAgentId !== actionRequest.agentId) {
      throw new GatewayError(403, "API key cannot access this action request.");
    }

    return actionRequest;
  }
}

export const gatewayService = new GatewayService();

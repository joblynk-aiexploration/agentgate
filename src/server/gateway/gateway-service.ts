import {
  ActionDecision,
  ActionStatus,
  ApprovalStatus,
  Prisma,
  RiskLevel,
} from "@/generated/prisma/client";
import type { Prisma as PrismaTypes } from "@/generated/prisma/client";
import { createAuditLog } from "@/server/audit/audit-service";
import { createRoleNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/server/gateway/authenticate-api-key";
import { mapGatewayDecisionToStatus } from "@/server/gateway/decision";
import {
  GatewayError,
  gatewayForbiddenError,
  gatewayNotFoundError,
} from "@/server/gateway/errors";
import {
  createGatewayCheckFingerprint,
  getRequestIp,
  getStoredIdempotencyFingerprint,
  metadataWithIdempotencyFingerprint,
} from "@/server/gateway/idempotency";
import type {
  GatewayActionRequest,
  GatewayCancelResponse,
  GatewayCheckRequest,
  GatewayDecisionResponse,
  GatewayExecutionResponse,
} from "@/server/gateway/types";
import { getToolExecutor } from "@/server/integrations/tool-executor";
import type { ToolExecutionResult } from "@/server/integrations/types";
import { policyEngine } from "@/server/policies/policy-engine";
import { localRiskEngine } from "@/server/risk/risk-engine";

function toJsonValue(value: unknown): PrismaTypes.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as PrismaTypes.InputJsonValue;
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

function responseFromActionRequest(actionRequest: {
  id: string;
  decision: ActionDecision;
  reason: string;
  status: ActionStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  metadataJson?: PrismaTypes.JsonValue | null;
  requiresApproval: boolean;
  approvalRequest?: { id: string } | null;
  riskAssessments?: {
    score: number;
    level: RiskLevel;
    signalsJson: PrismaTypes.JsonValue;
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

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function mergeExecutionMetadata(
  metadata: PrismaTypes.JsonValue | null,
  execution: ToolExecutionResult,
) {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  return toJsonValue({
    ...base,
    execution: {
      executedAt: new Date().toISOString(),
      executor: execution.executor,
      message: execution.message,
      output: execution.output,
      simulated: true,
      success: execution.success,
    },
  });
}

export class GatewayService {
  async check(
    input: GatewayCheckRequest,
    headers: Headers,
    idempotencyKey?: string | null,
  ): Promise<GatewayDecisionResponse> {
    const auth = await authenticateApiKey(headers);
    const ipAddress = getRequestIp(headers);
    const userAgent = headers.get("user-agent");
    const idempotencyFingerprint = idempotencyKey
      ? createGatewayCheckFingerprint(input)
      : null;

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
      throw gatewayNotFoundError("Agent not found.");
    }

    if (auth.apiKey.agentId && auth.apiKey.agentId !== agent.id) {
      throw gatewayForbiddenError("Gateway request is not allowed for this agent.");
    }

    // V1 idempotency is scoped to the authenticated organization, API key, and
    // idempotency key. Agent scope is enforced before replaying a prior decision.
    if (idempotencyKey) {
      const existing = await this.findIdempotentAction(
        auth.apiKey.organizationId,
        auth.apiKey.id,
        idempotencyKey,
      );

      if (existing) {
        const storedFingerprint = getStoredIdempotencyFingerprint(
          existing.metadataJson,
        );

        if (
          storedFingerprint &&
          idempotencyFingerprint &&
          storedFingerprint !== idempotencyFingerprint
        ) {
          throw new GatewayError(
            409,
            "Idempotency key was already used for a different gateway request.",
            "state",
          );
        }

        return responseFromActionRequest(existing);
      }
    }

    const toolConnection = await prisma.toolConnection.findFirst({
      where: {
        organizationId: auth.apiKey.organizationId,
        toolType: input.tool,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

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

    const decisionState = mapGatewayDecisionToStatus(policyResult.decision, input);
    const reason =
      policyResult.decision === ActionDecision.SANDBOX_ONLY &&
      decisionState.status === ActionStatus.BLOCKED
        ? `${policyResult.reason} Sandbox-only actions are blocked in production in V1.`
        : policyResult.reason;

    let actionRequest;

    try {
      actionRequest = await prisma.$transaction(async (tx) => {
        const createdAction = await tx.actionRequest.create({
          data: {
            organizationId: auth.apiKey.organizationId,
            agentId: agent.id,
            apiKeyId: auth.apiKey.id,
            tool: input.tool,
            action: input.action,
            environment: input.environment,
            payloadJson: toJsonValue(evaluationPayload),
            metadataJson: toJsonValue(
              metadataWithIdempotencyFingerprint(
                input.metadata,
                idempotencyFingerprint,
              ),
            ),
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
    } catch (error) {
      if (idempotencyKey && isUniqueConstraintError(error)) {
        const existing = await this.findIdempotentAction(
          auth.apiKey.organizationId,
          auth.apiKey.id,
          idempotencyKey,
        );

        if (existing) {
          const storedFingerprint = getStoredIdempotencyFingerprint(
            existing.metadataJson,
          );

          if (
            storedFingerprint &&
            idempotencyFingerprint &&
            storedFingerprint !== idempotencyFingerprint
          ) {
            throw new GatewayError(
              409,
              "Idempotency key was already used for a different gateway request.",
              "state",
            );
          }

          return responseFromActionRequest(existing);
        }
      }

      throw error;
    }

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
      ipAddress,
      userAgent,
    });

    if (actionRequest.approvalRequest) {
      await createAuditLog({
        organizationId: auth.apiKey.organizationId,
        actorType: "agent",
        actorId: agent.id,
        eventType: "approval.requested",
        targetType: "ActionRequest",
        targetId: actionRequest.id,
        metadataJson: {
          approvalRequestId: actionRequest.approvalRequest.id,
          requiredRole: policyResult.requiredRole,
          decision: actionRequest.decision,
          riskLevel: actionRequest.riskLevel,
        },
        ipAddress,
        userAgent,
      });

      await createRoleNotifications(
        auth.apiKey.organizationId,
        [policyResult.requiredRole ?? "reviewer", "org_owner"],
        {
          type: "approval.requested",
          title: "Approval requested",
          body: `${agent.name} requested ${actionRequest.action} through ${actionRequest.tool}.`,
          metadataJson: {
            actionRequestId: actionRequest.id,
            approvalRequestId: actionRequest.approvalRequest.id,
            agentId: agent.id,
            riskLevel: actionRequest.riskLevel,
            requiredRole: policyResult.requiredRole,
          },
        },
      );
    }

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
        ipAddress,
        userAgent,
      });

      await createRoleNotifications(
        auth.apiKey.organizationId,
        ["org_owner", "security_admin"],
        {
          type: "action.blocked",
          title: "Action blocked",
          body: `${agent.name} was blocked from ${actionRequest.action} in ${actionRequest.environment}.`,
          metadataJson: {
            actionRequestId: actionRequest.id,
            agentId: agent.id,
            decision: actionRequest.decision,
            riskLevel: actionRequest.riskLevel,
          },
        },
      );
    }

    return responseFromActionRequest(actionRequest);
  }

  async execute(
    input: GatewayActionRequest,
    headers: Headers,
  ): Promise<GatewayExecutionResponse> {
    const auth = await authenticateApiKey(headers);
    const ipAddress = getRequestIp(headers);
    const userAgent = headers.get("user-agent");
    const actionRequest = await this.getActionRequestForApiKey(
      auth.apiKey.organizationId,
      auth.apiKey.agentId,
      input.actionRequestId,
    );

    if (
      actionRequest.status !== ActionStatus.ALLOWED &&
      actionRequest.status !== ActionStatus.APPROVED
    ) {
      throw new GatewayError(400, "Action is not approved for execution.", "state");
    }

    const executor = getToolExecutor(actionRequest.tool);
    const toolConnection = await prisma.toolConnection.findFirst({
      where: {
        organizationId: auth.apiKey.organizationId,
        toolType: actionRequest.tool,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        configJson: true,
      },
    });
    const executionPayload =
      actionRequest.approvalRequest?.editedPayloadJson ?? actionRequest.payloadJson;
    const executionResult = await executor.execute({
      action: actionRequest.action,
      actionRequestId: actionRequest.id,
      agentId: actionRequest.agentId,
      environment: actionRequest.environment,
      metadata: actionRequest.metadataJson ?? {},
      organizationId: auth.apiKey.organizationId,
      payload: executionPayload,
      reason: actionRequest.reason,
      tool: actionRequest.tool,
      toolConnectionConfig: toolConnection?.configJson,
    });

    const updated = await prisma.actionRequest.update({
      where: {
        id: actionRequest.id,
        organizationId: auth.apiKey.organizationId,
      },
      data: {
        metadataJson: mergeExecutionMetadata(
          actionRequest.metadataJson,
          executionResult,
        ),
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
        execution: toJsonValue(executionResult),
      },
      ipAddress,
      userAgent,
    });

    return {
      actionRequestId: updated.id,
      status: updated.status,
      executed: true,
      result: executionResult,
    };
  }

  async cancel(
    input: GatewayActionRequest,
    headers: Headers,
  ): Promise<GatewayCancelResponse> {
    const auth = await authenticateApiKey(headers);
    const ipAddress = getRequestIp(headers);
    const userAgent = headers.get("user-agent");
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
      throw new GatewayError(400, "Action cannot be cancelled.", "state");
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
      ipAddress,
      userAgent,
    });

    return {
      actionRequestId: updated.id,
      status: updated.status,
      cancelled: true,
    };
  }

  private async findIdempotentAction(
    organizationId: string,
    apiKeyId: string,
    idempotencyKey: string,
  ) {
    return prisma.actionRequest.findFirst({
      where: {
        organizationId,
        apiKeyId,
        idempotencyKey,
      },
      select: {
        id: true,
        decision: true,
        reason: true,
        status: true,
        riskScore: true,
        riskLevel: true,
        metadataJson: true,
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
        action: true,
        environment: true,
        metadataJson: true,
        payloadJson: true,
        reason: true,
        status: true,
        tool: true,
        approvalRequest: {
          select: {
            editedPayloadJson: true,
          },
        },
      },
    });

    if (!actionRequest) {
      throw gatewayNotFoundError("Action request not found.");
    }

    if (scopedAgentId && scopedAgentId !== actionRequest.agentId) {
      throw gatewayForbiddenError(
        "Gateway request is not allowed for this action request.",
      );
    }

    return actionRequest;
  }
}

export const gatewayService = new GatewayService();

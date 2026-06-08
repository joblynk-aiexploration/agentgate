import { env } from "@/lib/env";

const jsonContent = (schema: unknown) => ({
  content: {
    "application/json": {
      schema,
    },
  },
});

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const parameterRef = (name: string) => ({
  $ref: `#/components/parameters/${name}`,
});

const errorResponse = {
  description: "Error response",
  ...jsonContent(ref("ErrorResponse")),
};

const okResponse = {
  description: "Success",
  ...jsonContent({
    type: "object",
    properties: {
      ok: { type: "boolean" },
    },
  }),
};

const security = {
  apiKey: [{ gatewayBearerAuth: [] }],
  session: [{ sessionCookieAuth: [] }],
};

function collectionResponse(name: string, itemSchema: unknown) {
  return {
    description: `${name} list`,
    ...jsonContent({
      type: "object",
      properties: {
        [name]: {
          type: "array",
          items: itemSchema,
        },
      },
      required: [name],
    }),
  };
}

function objectResponse(name: string, schema: unknown) {
  return {
    description: `${name} response`,
    ...jsonContent({
      type: "object",
      properties: {
        [name]: schema,
      },
      required: [name],
    }),
  };
}

const approvalReviewBody = jsonContent(ref("ApprovalReviewRequest"));
const actionRequestBody = jsonContent(ref("GatewayActionRequest"));

export function getOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "AgentGate API",
      version: "1.0.0",
      description:
        "Public and developer APIs for AgentGate V1. V1 uses local rules only and simulated execution only.",
    },
    servers: [
      {
        url: env.APP_URL,
        description: "Configured AgentGate app URL",
      },
    ],
    tags: [
      { name: "Gateway" },
      { name: "Developer API Keys" },
      { name: "Agents" },
      { name: "Approvals" },
      { name: "Audit" },
      { name: "Settings" },
    ],
    paths: {
      "/api/gateway/check": {
        post: {
          tags: ["Gateway"],
          summary: "Evaluate an agent action before execution",
          security: security.apiKey,
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: false,
              schema: { type: "string", maxLength: 160 },
            },
          ],
          requestBody: {
            required: true,
            ...jsonContent(ref("GatewayCheckRequest")),
          },
          responses: {
            "200": {
              description: "Gateway decision",
              ...jsonContent(ref("GatewayCheckResponse")),
            },
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
            "429": errorResponse,
          },
        },
      },
      "/api/gateway/execute": {
        post: {
          tags: ["Gateway"],
          summary: "Simulate execution for an allowed or approved action",
          description:
            "V1 never calls real external tools. Execution is simulated and audited.",
          security: security.apiKey,
          requestBody: { required: true, ...actionRequestBody },
          responses: {
            "200": {
              description: "Simulated execution result",
              ...jsonContent(ref("GatewayExecuteResponse")),
            },
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/gateway/cancel": {
        post: {
          tags: ["Gateway"],
          summary: "Cancel a pending gateway action",
          security: security.apiKey,
          requestBody: { required: true, ...actionRequestBody },
          responses: {
            "200": {
              description: "Cancelled action",
              ...jsonContent(ref("GatewayCancelResponse")),
            },
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/developer/api-keys": {
        get: {
          tags: ["Developer API Keys"],
          summary: "List API keys for the current organization",
          security: security.session,
          responses: {
            "200": collectionResponse("apiKeys", ref("ApiKeySummary")),
            "401": errorResponse,
          },
        },
        post: {
          tags: ["Developer API Keys"],
          summary: "Create an API key",
          description:
            "The full API key is returned once immediately after creation. Only the hash is stored.",
          security: security.session,
          requestBody: { required: true, ...jsonContent(ref("ApiKeyCreateRequest")) },
          responses: {
            "201": {
              description: "Created API key with one-time full key",
              ...jsonContent({
                type: "object",
                properties: {
                  apiKey: ref("ApiKeySummary"),
                  fullKey: {
                    type: "string",
                    description: "Shown once. Never returned again.",
                  },
                  message: { type: "string" },
                },
                required: ["apiKey", "fullKey", "message"],
              }),
            },
            "400": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/developer/api-keys/{id}/revoke": {
        post: {
          tags: ["Developer API Keys"],
          summary: "Revoke an API key",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          responses: {
            "200": objectResponse("apiKey", ref("ApiKeySummary")),
            "403": errorResponse,
            "404": errorResponse,
          },
        },
      },
      "/api/agents": {
        get: {
          tags: ["Agents"],
          summary: "List agents",
          security: security.session,
          responses: {
            "200": collectionResponse("agents", ref("Agent")),
            "401": errorResponse,
          },
        },
        post: {
          tags: ["Agents"],
          summary: "Create an agent",
          security: security.session,
          requestBody: { required: true, ...jsonContent(ref("AgentInput")) },
          responses: {
            "201": objectResponse("agent", ref("Agent")),
            "400": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/agents/{id}": {
        get: {
          tags: ["Agents"],
          summary: "Get an agent",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          responses: {
            "200": objectResponse("agent", ref("Agent")),
            "401": errorResponse,
            "404": errorResponse,
          },
        },
        patch: {
          tags: ["Agents"],
          summary: "Update an agent",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          requestBody: { required: true, ...jsonContent(ref("AgentPatchInput")) },
          responses: {
            "200": objectResponse("agent", ref("Agent")),
            "400": errorResponse,
            "403": errorResponse,
            "404": errorResponse,
          },
        },
        delete: {
          tags: ["Agents"],
          summary: "Delete an agent",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          responses: {
            "200": okResponse,
            "403": errorResponse,
            "404": errorResponse,
          },
        },
      },
      "/api/agents/{id}/pause": {
        post: {
          tags: ["Agents"],
          summary: "Pause an agent",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          responses: {
            "200": objectResponse("agent", ref("Agent")),
            "403": errorResponse,
          },
        },
      },
      "/api/agents/{id}/resume": {
        post: {
          tags: ["Agents"],
          summary: "Resume an agent",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          responses: {
            "200": objectResponse("agent", ref("Agent")),
            "403": errorResponse,
          },
        },
      },
      "/api/approvals": {
        get: {
          tags: ["Approvals"],
          summary: "List approvals",
          security: security.session,
          parameters: [
            parameterRef("ApprovalStatusQueryParameter"),
            parameterRef("RiskLevelQueryParameter"),
            parameterRef("ToolQueryParameter"),
            parameterRef("AgentIdQueryParameter"),
            parameterRef("DateQueryParameter"),
            parameterRef("AssignedToMeQueryParameter"),
          ],
          responses: {
            "200": collectionResponse("approvals", ref("ApprovalRequest")),
            "400": errorResponse,
            "401": errorResponse,
          },
        },
      },
      "/api/approvals/{id}": {
        get: {
          tags: ["Approvals"],
          summary: "Get an approval",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          responses: {
            "200": objectResponse("approval", ref("ApprovalRequest")),
            "401": errorResponse,
            "404": errorResponse,
          },
        },
      },
      "/api/approvals/{id}/approve": {
        post: {
          tags: ["Approvals"],
          summary: "Approve an approval request",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          requestBody: { required: false, ...approvalReviewBody },
          responses: {
            "200": objectResponse("approval", ref("ApprovalRequest")),
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/approvals/{id}/reject": {
        post: {
          tags: ["Approvals"],
          summary: "Reject an approval request",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          requestBody: { required: false, ...approvalReviewBody },
          responses: {
            "200": objectResponse("approval", ref("ApprovalRequest")),
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/approvals/{id}/edit": {
        post: {
          tags: ["Approvals"],
          summary: "Save an edited approval payload",
          security: security.session,
          parameters: [parameterRef("IdPathParameter")],
          requestBody: { required: true, ...jsonContent(ref("ApprovalEditRequest")) },
          responses: {
            "200": objectResponse("approval", ref("ApprovalRequest")),
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/audit-logs": {
        get: {
          tags: ["Audit"],
          summary: "List audit logs",
          security: security.session,
          parameters: [
            parameterRef("EventTypeQueryParameter"),
            parameterRef("ActorTypeQueryParameter"),
            parameterRef("TargetTypeQueryParameter"),
            parameterRef("FromDateQueryParameter"),
            parameterRef("ToDateQueryParameter"),
            parameterRef("SearchQueryParameter"),
          ],
          responses: {
            "200": collectionResponse("auditLogs", ref("AuditLog")),
            "400": errorResponse,
            "401": errorResponse,
          },
        },
      },
      "/api/audit-logs/export": {
        get: {
          tags: ["Audit"],
          summary: "Export audit logs as CSV",
          security: security.session,
          responses: {
            "200": {
              description: "CSV export for current organization audit logs",
              content: {
                "text/csv": {
                  schema: { type: "string" },
                },
              },
            },
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/settings": {
        get: {
          tags: ["Settings"],
          summary: "Get organization settings",
          security: security.session,
          responses: {
            "200": objectResponse("organization", ref("OrganizationSettings")),
            "401": errorResponse,
          },
        },
        patch: {
          tags: ["Settings"],
          summary: "Update organization settings",
          security: security.session,
          requestBody: { required: true, ...jsonContent(ref("SettingsUpdateRequest")) },
          responses: {
            "200": objectResponse("organization", ref("OrganizationSettings")),
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/settings/kill-switch/enable": {
        post: {
          tags: ["Settings"],
          summary: "Enable organization kill switch",
          security: security.session,
          responses: {
            "200": objectResponse("organization", ref("OrganizationSettings")),
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/settings/kill-switch/disable": {
        post: {
          tags: ["Settings"],
          summary: "Disable organization kill switch",
          security: security.session,
          responses: {
            "200": objectResponse("organization", ref("OrganizationSettings")),
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        gatewayBearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Agent/developer API key. Never used for human login.",
        },
        sessionCookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "agentgate_session",
          description: "httpOnly human dashboard session cookie.",
        },
      },
      parameters: {
        IdPathParameter: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        ApprovalStatusQueryParameter: {
          name: "status",
          in: "query",
          required: false,
          schema: { $ref: "#/components/schemas/ApprovalStatus" },
        },
        RiskLevelQueryParameter: {
          name: "riskLevel",
          in: "query",
          required: false,
          schema: { $ref: "#/components/schemas/RiskLevel" },
        },
        ToolQueryParameter: {
          name: "tool",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        AgentIdQueryParameter: {
          name: "agentId",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        DateQueryParameter: {
          name: "date",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
        },
        AssignedToMeQueryParameter: {
          name: "assignedToMe",
          in: "query",
          required: false,
          schema: { type: "boolean" },
        },
        EventTypeQueryParameter: {
          name: "eventType",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        ActorTypeQueryParameter: {
          name: "actorType",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        TargetTypeQueryParameter: {
          name: "targetType",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        FromDateQueryParameter: {
          name: "from",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
        },
        ToDateQueryParameter: {
          name: "to",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
        },
        SearchQueryParameter: {
          name: "search",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
      },
      schemas: {
        ActionDecision: {
          type: "string",
          enum: ["ALLOW", "REQUIRE_APPROVAL", "BLOCK", "LOG_ONLY", "SANDBOX_ONLY"],
        },
        ActionStatus: {
          type: "string",
          enum: [
            "REQUESTED",
            "ALLOWED",
            "PENDING_APPROVAL",
            "APPROVED",
            "REJECTED",
            "BLOCKED",
            "EXECUTED",
            "FAILED",
            "CANCELLED",
            "EXPIRED",
          ],
        },
        RiskLevel: {
          type: "string",
          enum: ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
        },
        ApprovalStatus: {
          type: "string",
          enum: [
            "PENDING",
            "APPROVED",
            "REJECTED",
            "EDITED",
            "EXPIRED",
            "CANCELLED",
            "AUTO_APPROVED",
            "AUTO_BLOCKED",
          ],
        },
        AgentStatus: {
          type: "string",
          enum: ["ACTIVE", "PAUSED", "LOCKED", "DISABLED"],
        },
        AgentRiskTier: {
          type: "string",
          enum: ["LOW", "STANDARD", "HIGH", "CRITICAL"],
        },
        ApiKeyStatus: {
          type: "string",
          enum: ["ACTIVE", "REVOKED", "EXPIRED"],
        },
        ToolType: {
          type: "string",
          enum: [
            "SLACK",
            "STRIPE",
            "GMAIL",
            "EMAIL_PREVIEW",
            "HUBSPOT",
            "SALESFORCE",
            "GITHUB",
            "POSTGRES",
            "WEBHOOK",
            "DEMO_COMMERCE",
            "CUSTOM",
          ],
        },
        JsonObject: {
          type: "object",
          additionalProperties: true,
        },
        Risk: {
          type: "object",
          properties: {
            score: { type: "integer" },
            level: ref("RiskLevel"),
            signals: { type: "array", items: { type: "string" } },
            explanation: { type: "string" },
          },
          required: ["score", "level", "signals", "explanation"],
        },
        GatewayCheckRequest: {
          type: "object",
          properties: {
            agentId: { type: "string" },
            tool: { type: "string", examples: ["stripe", "WEBHOOK"] },
            action: { type: "string", examples: ["refund.create", "webhook.trigger"] },
            environment: { type: "string", default: "production" },
            amount: { type: ["number", "null"] },
            currency: { type: ["string", "null"] },
            reason: { type: ["string", "null"] },
            payload: ref("JsonObject"),
            metadata: ref("JsonObject"),
            dataSensitivity: { type: ["string", "null"] },
            reversible: { type: ["boolean", "null"] },
            externalCommunication: { type: ["boolean", "null"] },
            productionEnvironment: { type: ["boolean", "null"] },
          },
          required: ["agentId", "tool", "action"],
        },
        GatewayCheckResponse: {
          type: "object",
          properties: {
            actionRequestId: { type: "string" },
            decision: ref("ActionDecision"),
            allowed: { type: "boolean" },
            requiresApproval: { type: "boolean" },
            approvalRequestId: { type: "string" },
            risk: ref("Risk"),
            reason: { type: "string" },
            status: ref("ActionStatus"),
          },
          required: [
            "actionRequestId",
            "decision",
            "allowed",
            "requiresApproval",
            "risk",
            "reason",
            "status",
          ],
        },
        GatewayActionRequest: {
          type: "object",
          properties: {
            actionRequestId: { type: "string" },
          },
          required: ["actionRequestId"],
        },
        GatewayExecuteResponse: {
          type: "object",
          properties: {
            actionRequestId: { type: "string" },
            status: ref("ActionStatus"),
            executed: { type: "boolean" },
            result: {
              type: "object",
              properties: {
                executor: { type: "string" },
                message: { type: "string" },
                output: ref("JsonObject"),
                simulated: { type: "boolean", const: true },
                success: { type: "boolean" },
              },
              required: ["executor", "message", "output", "simulated", "success"],
            },
          },
          required: ["actionRequestId", "status", "executed", "result"],
        },
        GatewayCancelResponse: {
          type: "object",
          properties: {
            actionRequestId: { type: "string" },
            status: ref("ActionStatus"),
            cancelled: { type: "boolean" },
          },
          required: ["actionRequestId", "status", "cancelled"],
        },
        Agent: {
          type: "object",
          properties: {
            id: { type: "string" },
            organizationId: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: ["string", "null"] },
            ownerUserId: { type: ["string", "null"] },
            department: { type: ["string", "null"] },
            status: ref("AgentStatus"),
            riskTier: ref("AgentRiskTier"),
            allowedTools: {
              type: "array",
              items: ref("ToolType"),
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["id", "organizationId", "name", "slug", "status", "riskTier"],
        },
        AgentInput: {
          type: "object",
          properties: {
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: ["string", "null"] },
            department: { type: ["string", "null"] },
            ownerUserId: { type: ["string", "null"] },
            status: ref("AgentStatus"),
            riskTier: ref("AgentRiskTier"),
            allowedTools: { type: "array", items: ref("ToolType"), minItems: 1 },
          },
          required: ["name", "slug", "status", "riskTier", "allowedTools"],
        },
        AgentPatchInput: {
          type: "object",
          properties: {
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: ["string", "null"] },
            department: { type: ["string", "null"] },
            ownerUserId: { type: ["string", "null"] },
            status: ref("AgentStatus"),
            riskTier: ref("AgentRiskTier"),
            allowedTools: { type: "array", items: ref("ToolType") },
          },
        },
        ApiKeySummary: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            keyPrefix: { type: "string" },
            status: ref("ApiKeyStatus"),
            lastUsedAt: { type: ["string", "null"], format: "date-time" },
            expiresAt: { type: ["string", "null"], format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            agent: {
              type: ["object", "null"],
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
          required: ["id", "name", "keyPrefix", "status", "createdAt"],
        },
        ApiKeyCreateRequest: {
          type: "object",
          properties: {
            name: { type: "string" },
            agentId: { type: ["string", "null"] },
            expiresAt: { type: ["string", "null"], format: "date" },
          },
          required: ["name"],
        },
        ApprovalRequest: {
          type: "object",
          properties: {
            id: { type: "string" },
            organizationId: { type: "string" },
            actionRequestId: { type: "string" },
            status: ref("ApprovalStatus"),
            requiredRole: { type: ["string", "null"] },
            assignedToId: { type: ["string", "null"] },
            reviewedById: { type: ["string", "null"] },
            reviewComment: { type: ["string", "null"] },
            editedPayloadJson: ref("JsonObject"),
            expiresAt: { type: ["string", "null"], format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["id", "organizationId", "actionRequestId", "status"],
        },
        ApprovalReviewRequest: {
          type: "object",
          properties: {
            comment: { type: ["string", "null"], maxLength: 2000 },
          },
        },
        ApprovalEditRequest: {
          type: "object",
          properties: {
            editedPayloadJson: ref("JsonObject"),
            comment: { type: ["string", "null"], maxLength: 2000 },
          },
          required: ["editedPayloadJson"],
        },
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "string" },
            organizationId: { type: ["string", "null"] },
            actorType: { type: "string" },
            actorId: { type: ["string", "null"] },
            eventType: { type: "string" },
            targetType: { type: ["string", "null"] },
            targetId: { type: ["string", "null"] },
            metadataJson: ref("JsonObject"),
            metadataSummary: { type: "string" },
            ipAddress: { type: ["string", "null"] },
            userAgent: { type: ["string", "null"] },
            createdAt: { type: "string", format: "date-time" },
          },
          required: ["id", "actorType", "eventType", "createdAt"],
        },
        OrganizationSettings: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            plan: { type: "string" },
            status: { type: "string" },
            killSwitchEnabled: { type: "boolean" },
            aiReviewerMode: {
              type: "string",
              enum: ["LOCAL_RULES_ONLY"],
            },
          },
          required: ["id", "name", "slug", "plan", "status", "killSwitchEnabled"],
        },
        SettingsUpdateRequest: {
          type: "object",
          properties: {
            name: { type: "string" },
            aiReviewerMode: {
              type: "string",
              enum: ["DISABLED", "LOCAL_RULES_ONLY", "LOCAL_MODEL", "PREMIUM_MODEL"],
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            issues: ref("JsonObject"),
          },
          required: ["error"],
        },
      },
    },
  };
}

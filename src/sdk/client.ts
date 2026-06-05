import type {
  AgentGateCancelResponse,
  AgentGateCheckInput,
  AgentGateCheckResponse,
  AgentGateClientOptions,
  AgentGateExecuteResponse,
} from "@/sdk/types";

type AgentGateRequestBody = Record<string, unknown>;

export class AgentGateError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AgentGateError";
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

async function parseResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessageFromBody(body: unknown) {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;

    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return "AgentGate request failed.";
}

export class AgentGateClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AgentGateClientOptions) {
    if (!options.apiKey?.trim()) {
      throw new Error("AgentGateClient requires an API key.");
    }

    this.apiKey = options.apiKey;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? "http://localhost:3000");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async check(input: AgentGateCheckInput): Promise<AgentGateCheckResponse> {
    const { idempotencyKey, ...body } = input;

    return this.request<AgentGateCheckResponse>("/api/gateway/check", body, {
      idempotencyKey,
    });
  }

  async execute(actionRequestId: string): Promise<AgentGateExecuteResponse> {
    return this.request<AgentGateExecuteResponse>("/api/gateway/execute", {
      actionRequestId,
    });
  }

  async cancel(actionRequestId: string): Promise<AgentGateCancelResponse> {
    return this.request<AgentGateCancelResponse>("/api/gateway/cancel", {
      actionRequestId,
    });
  }

  private async request<TResponse>(
    path: string,
    body: AgentGateRequestBody,
    options: { idempotencyKey?: string } = {},
  ): Promise<TResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers,
      method: "POST",
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new AgentGateError(
        errorMessageFromBody(responseBody),
        response.status,
        responseBody,
      );
    }

    return responseBody as TResponse;
  }
}

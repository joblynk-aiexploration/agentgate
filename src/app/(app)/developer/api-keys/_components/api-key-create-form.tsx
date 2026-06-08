"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type CreateApiKeyState = {
  error: string | null;
  fullKey: string | null;
  keyPrefix: string | null;
};

type ApiKeyCreateFormProps = {
  agents: {
    id: string;
    name: string;
  }[];
  canCreate: boolean;
  createAction: (
    state: CreateApiKeyState,
    formData: FormData,
  ) => Promise<CreateApiKeyState>;
};

const initialState: CreateApiKeyState = {
  error: null,
  fullKey: null,
  keyPrefix: null,
};

export function ApiKeyCreateForm({
  agents,
  canCreate,
  createAction,
}: ApiKeyCreateFormProps) {
  const [state, formAction, isPending] = useActionState(
    createAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create API key</CardTitle>
      </CardHeader>
      <CardContent>
        {state.fullKey ? (
          <Alert className="mb-5" tone="warning" title="The full API key is shown once. Copy it now.">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3">
                <KeyRound className="h-4 w-4 text-amber-700" aria-hidden />
                <code className="min-w-0 flex-1 break-all text-sm text-slate-950">
                  {state.fullKey}
                </code>
                <CopyButton label="Copy key" text={state.fullKey} />
              </div>
              <p className="text-xs text-amber-900">
                Stored display prefix: {state.keyPrefix}. AgentGate stores only the hash,
                never the full key.
              </p>
            </div>
          </Alert>
        ) : null}

        {state.error ? (
          <Alert className="mb-5" tone="danger" title="API key creation failed">
            {state.error}
          </Alert>
        ) : null}

        <form action={formAction} className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium">
              Name
              <Input disabled={!canCreate || isPending} name="name" required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Agent scope
              <Select disabled={!canCreate || isPending} name="agentId">
                <option value="">Organization-wide</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Expires at
              <Input disabled={!canCreate || isPending} name="expiresAt" type="date" />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#e5e9ef] pt-5">
            <p className="text-sm text-[#5c6470]">
              API keys are for agent gateway calls, never human login.
            </p>
            <Button disabled={!canCreate || isPending} type="submit">
              {isPending ? "Creating..." : "Create key"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

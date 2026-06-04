"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <div className="mb-5 border border-[#e6d1a7] bg-[#fff8e7] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#83611b]">
              <KeyRound className="h-4 w-4" aria-hidden />
              The full API key is shown once. Copy it now.
            </div>
            <code className="mt-3 block break-all bg-white p-3 text-sm text-[#172326]">
              {state.fullKey}
            </code>
            <p className="mt-2 text-xs text-[#687384]">
              Stored display prefix: {state.keyPrefix}
            </p>
          </div>
        ) : null}

        {state.error ? (
          <div className="mb-5 border border-[#e6c6b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#9d3f1f]">
            {state.error}
          </div>
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

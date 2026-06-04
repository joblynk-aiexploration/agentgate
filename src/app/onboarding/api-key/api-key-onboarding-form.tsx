"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type OnboardingApiKeyState = {
  error: string | null;
  fullKey: string | null;
  keyPrefix: string | null;
};

type ApiKeyOnboardingFormProps = {
  agents: {
    id: string;
    name: string;
  }[];
  defaultAgentId?: string;
  createAction: (
    state: OnboardingApiKeyState,
    formData: FormData,
  ) => Promise<OnboardingApiKeyState>;
};

const initialState: OnboardingApiKeyState = {
  error: null,
  fullKey: null,
  keyPrefix: null,
};

export function ApiKeyOnboardingForm({
  agents,
  defaultAgentId,
  createAction,
}: ApiKeyOnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(
    createAction,
    initialState,
  );

  if (state.fullKey) {
    return (
      <div className="grid gap-5">
        <div className="border border-[#e6d1a7] bg-[#fff8e7] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#83611b]">
            <KeyRound className="h-4 w-4" aria-hidden />
            The full API key is shown once. Copy it now.
          </div>
          <code className="mt-4 block break-all bg-white p-4 text-sm text-[#172326]">
            {state.fullKey}
          </code>
          <p className="mt-3 text-xs text-[#687384]">
            Stored display prefix: {state.keyPrefix}
          </p>
        </div>

        <div className="flex flex-col gap-3 border border-[#d9dee8] bg-[#f8fafc] p-4 text-sm leading-6 text-[#5c6470] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Use this key from an AI agent or developer script to call the
            Gateway API. It is not for human login.
          </span>
          <Button href="/dashboard">Go to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5">
      {state.error ? (
        <div className="border border-[#e6c6b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#9d3f1f]">
          {state.error}
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium">
        Key name
        <Input
          defaultValue="Onboarding gateway key"
          disabled={isPending}
          name="name"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Agent scope
        <Select
          defaultValue={defaultAgentId ?? agents[0]?.id}
          disabled={isPending}
          name="agentId"
          required
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </Select>
      </label>

      <div className="border border-[#d9dee8] bg-[#f8fafc] p-4 text-sm leading-6 text-[#5c6470]">
        AgentGate stores only a hash and display prefix. The complete API key
        is shown one time after creation.
      </div>

      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          {isPending ? "Creating..." : "Create API key"}
        </Button>
      </div>
    </form>
  );
}

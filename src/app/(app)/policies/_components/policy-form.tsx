"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatEnumLabel } from "@/lib/format";

const policyStatuses = ["ACTIVE", "DRAFT", "DISABLED"] as const;
const toolTypes = [
  "SLACK",
  "STRIPE",
  "GMAIL",
  "EMAIL_PREVIEW",
  "HUBSPOT",
  "SALESFORCE",
  "GITHUB",
  "POSTGRES",
  "WEBHOOK",
  "CUSTOM",
] as const;
const decisions = [
  "ALLOW",
  "REQUIRE_APPROVAL",
  "BLOCK",
  "LOG_ONLY",
  "SANDBOX_ONLY",
] as const;
const membershipRoles = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
  "reviewer",
  "auditor",
] as const;
const riskLevels = ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

type RuleFormState = {
  id: string;
  tool: string;
  action: string;
  decision: string;
  requiredRole: string;
  riskOverride: string;
  conditionsText: string;
};

type PolicyFormState = {
  description: string;
  name: string;
  priority: number;
  status: string;
  rules: RuleFormState[];
};

type InitialPolicy = {
  id: string;
  description: string | null;
  name: string;
  priority: number;
  status: string;
  rules: {
    id: string;
    action: string | null;
    conditionsJson: unknown;
    decision: string;
    requiredRole: string | null;
    riskOverride: string | null;
    tool: string | null;
  }[];
};

type InitialTemplate = {
  id: string;
  policy: {
    description: string | null;
    name: string;
    priority: number;
    status: string;
    rules: {
      action: string | null;
      conditionsJson: unknown;
      decision: string;
      requiredRole: string | null;
      riskOverride: string | null;
      tool: string | null;
    }[];
  };
};

type PolicyFormProps = {
  canManage: boolean;
  initialPolicy?: InitialPolicy;
  initialTemplate?: InitialTemplate;
};

const emptyRule = (): RuleFormState => ({
  id: crypto.randomUUID(),
  tool: "",
  action: "",
  decision: "REQUIRE_APPROVAL",
  requiredRole: "",
  riskOverride: "",
  conditionsText: "{\n  \"all\": []\n}",
});

function stringifyConditions(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function getInitialState(
  initialPolicy?: InitialPolicy,
  initialTemplate?: InitialTemplate,
): PolicyFormState {
  if (initialPolicy) {
    return {
      description: initialPolicy.description ?? "",
      name: initialPolicy.name,
      priority: initialPolicy.priority,
      status: initialPolicy.status,
      rules: initialPolicy.rules.map((rule) => ({
        id: rule.id,
        tool: rule.tool ?? "",
        action: rule.action ?? "",
        decision: rule.decision,
        requiredRole: rule.requiredRole ?? "",
        riskOverride: rule.riskOverride ?? "",
        conditionsText: stringifyConditions(rule.conditionsJson),
      })),
    };
  }

  if (initialTemplate) {
    return {
      description: initialTemplate.policy.description ?? "",
      name: initialTemplate.policy.name,
      priority: initialTemplate.policy.priority,
      status: initialTemplate.policy.status,
      rules: initialTemplate.policy.rules.map((rule) => ({
        id: crypto.randomUUID(),
        tool: rule.tool ?? "",
        action: rule.action ?? "",
        decision: rule.decision,
        requiredRole: rule.requiredRole ?? "",
        riskOverride: rule.riskOverride ?? "",
        conditionsText: stringifyConditions(rule.conditionsJson),
      })),
    };
  }

  return {
    description: "",
    name: "",
    priority: 100,
    status: "DRAFT",
    rules: [emptyRule()],
  };
}

export function PolicyForm({
  canManage,
  initialPolicy,
  initialTemplate,
}: PolicyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState(() =>
    getInitialState(initialPolicy, initialTemplate),
  );
  const isEditing = Boolean(initialPolicy);
  const templateId = initialTemplate?.id ?? null;
  const title = useMemo(
    () => (isEditing ? "Edit policy" : "Create policy"),
    [isEditing],
  );

  function updateRule(ruleId: string, patch: Partial<RuleFormState>) {
    setState((current) => ({
      ...current,
      rules: current.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule,
      ),
    }));
  }

  function submitPolicy() {
    startTransition(async () => {
      setError(null);

      let rules;

      try {
        rules = state.rules.map((rule) => ({
          tool: rule.tool || null,
          action: rule.action || null,
          decision: rule.decision,
          requiredRole: rule.requiredRole || null,
          riskOverride: rule.riskOverride || null,
          conditionsJson: JSON.parse(rule.conditionsText || "{}"),
        }));
      } catch {
        setError("One or more rule condition blocks contain invalid JSON.");
        return;
      }

      const policyPayload = {
        name: state.name,
        description: state.description || null,
        status: state.status,
        priority: state.priority,
        rules,
      };

      const response = await fetch(
        isEditing
          ? `/api/policies/${initialPolicy?.id}`
          : templateId
            ? "/api/policies/from-template"
            : "/api/policies",
        {
          body: JSON.stringify(
            templateId
              ? {
                  policy: policyPayload,
                  templateId,
                }
              : policyPayload,
          ),
          headers: {
            "Content-Type": "application/json",
          },
          method: isEditing ? "PATCH" : "POST",
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Policy save failed.");
        return;
      }

      const policyId = body.policy?.id ?? initialPolicy?.id;

      router.push(policyId ? `/policies/${policyId}` : "/policies");
      router.refresh();
    });
  }

  function deleteCurrentPolicy() {
    if (!initialPolicy) {
      return;
    }

    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/policies/${initialPolicy.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Policy deletion failed.");
        return;
      }

      router.push("/policies");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{canManage ? title : "Policy profile"}</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-5 border border-[#e6c6b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#9d3f1f]">
            {error}
          </div>
        ) : null}

        {initialTemplate ? (
          <div className="mb-5 flex items-start gap-3 border border-[#b9d2e4] bg-[#eef6fb] px-4 py-3 text-sm leading-6 text-[#245f7b]">
            <FilePlus2 className="mt-1 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Template loaded: <span className="font-semibold">{initialTemplate.policy.name}</span>.
              Review and edit the fields below before saving it to this organization.
            </p>
          </div>
        ) : null}

        <form action={submitPolicy} className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-[1fr_160px_160px]">
            <label className="grid gap-2 text-sm font-medium">
              Name
              <Input
                disabled={!canManage || isPending}
                onChange={(event) =>
                  setState((current) => ({ ...current, name: event.target.value }))
                }
                required
                value={state.name}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Status
              <Select
                disabled={!canManage || isPending}
                onChange={(event) =>
                  setState((current) => ({ ...current, status: event.target.value }))
                }
                required
                value={state.status}
              >
                {policyStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatEnumLabel(status)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Priority
              <Input
                disabled={!canManage || isPending}
                min={1}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    priority: Number(event.target.value),
                  }))
                }
                required
                type="number"
                value={state.priority}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Description
            <Textarea
              disabled={!canManage || isPending}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              value={state.description}
            />
          </label>

          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold">Rules</h3>
              {canManage ? (
                <Button
                  disabled={isPending}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      rules: [...current.rules, emptyRule()],
                    }))
                  }
                  type="button"
                  variant="secondary"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add rule
                </Button>
              ) : null}
            </div>

            {state.rules.map((rule, index) => (
              <div
                className="grid gap-4 border border-[#d9dee8] bg-[#f8fafc] p-4"
                key={rule.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold">Rule {index + 1}</p>
                  {canManage && state.rules.length > 1 ? (
                    <Button
                      className="h-8"
                      disabled={isPending}
                      onClick={() =>
                        setState((current) => ({
                          ...current,
                          rules: current.rules.filter((item) => item.id !== rule.id),
                        }))
                      }
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="grid gap-2 text-sm font-medium">
                    Tool
                    <Select
                      disabled={!canManage || isPending}
                      onChange={(event) =>
                        updateRule(rule.id, { tool: event.target.value })
                      }
                      value={rule.tool}
                    >
                      <option value="">Any tool</option>
                      {toolTypes.map((tool) => (
                        <option key={tool} value={tool}>
                          {formatEnumLabel(tool)}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Action
                    <Input
                      disabled={!canManage || isPending}
                      onChange={(event) =>
                        updateRule(rule.id, { action: event.target.value })
                      }
                      placeholder="refund.create"
                      value={rule.action}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Decision
                    <Select
                      disabled={!canManage || isPending}
                      onChange={(event) =>
                        updateRule(rule.id, { decision: event.target.value })
                      }
                      required
                      value={rule.decision}
                    >
                      {decisions.map((decision) => (
                        <option key={decision} value={decision}>
                          {formatEnumLabel(decision)}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Required role
                    <Select
                      disabled={!canManage || isPending}
                      onChange={(event) =>
                        updateRule(rule.id, { requiredRole: event.target.value })
                      }
                      value={rule.requiredRole}
                    >
                      <option value="">No required role</option>
                      {membershipRoles.map((role) => (
                        <option key={role} value={role}>
                          {formatEnumLabel(role)}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Risk override
                    <Select
                      disabled={!canManage || isPending}
                      onChange={(event) =>
                        updateRule(rule.id, { riskOverride: event.target.value })
                      }
                      value={rule.riskOverride}
                    >
                      <option value="">No override</option>
                      {riskLevels.map((level) => (
                        <option key={level} value={level}>
                          {formatEnumLabel(level)}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-medium">
                  Conditions JSON
                  <Textarea
                    className="min-h-40 font-mono text-xs"
                    disabled={!canManage || isPending}
                    onChange={(event) =>
                      updateRule(rule.id, { conditionsText: event.target.value })
                    }
                    spellCheck={false}
                    value={rule.conditionsText}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e9ef] pt-5">
            {isEditing && canManage ? (
              <Button
                disabled={isPending}
                onClick={deleteCurrentPolicy}
                type="button"
                variant="danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete policy
              </Button>
            ) : (
              <span />
            )}

            {canManage ? (
              <Button disabled={isPending} type="submit">
                {isPending ? "Saving..." : "Save policy"}
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

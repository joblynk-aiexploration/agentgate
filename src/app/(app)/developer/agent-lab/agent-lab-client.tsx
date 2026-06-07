"use client";

import Link from "next/link";
import { AlertTriangle, ClipboardCheck, FileClock, Play, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonViewer } from "@/components/ui/json-viewer";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";

type Scenario = {
  expectedSafetyBehavior: string;
  intendedAction: string;
  intendedTool: string;
  name: string;
  ticketId: string;
  ticketSummary: string;
  title: string;
};

type AgentLabResult = {
  agent: {
    id: string;
    name: string;
    slug: string;
  };
  decision: {
    actionRequestId: string;
    allowed: boolean;
    approvalRequestId?: string;
    decision: string;
    reason: string;
    requiresApproval: boolean;
    risk: {
      explanation: string;
      level: string;
      score: number;
      signals: string[];
    };
    status: string;
  };
  executionResult?: {
    actionRequestId: string;
    executed: boolean;
    result: unknown;
    status: string;
  };
  intendedAction: unknown;
  keyPrefix: string;
  links: {
    action: string;
    approval: string | null;
    auditLogs: string;
  };
  scenario: Scenario;
  ticket: {
    ticket: string;
    ticketId: string;
    title: string;
  };
  transcriptSummary: {
    actionRequestId: string;
    approvalRequestId?: string;
    completedAt: string;
    executed: boolean;
    mode: string;
    notes: string[];
  };
};

type IntendedActionSummary = {
  metadata?: unknown;
  payload?: unknown;
};

function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ResultPanel({ result }: { result: AgentLabResult }) {
  const intendedAction = result.intendedAction as IntendedActionSummary;

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>AgentGate Decision</CardTitle>
              <p className="mt-2 text-sm text-[#5c6470]">
                {result.agent.name} requested{" "}
                <code className="font-mono text-xs text-[#172326]">
                  {result.scenario.intendedTool}
                </code>{" "}
                /{" "}
                <code className="font-mono text-xs text-[#172326]">
                  {result.scenario.intendedAction}
                </code>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={result.decision.decision} />
              <RiskBadge risk={result.decision.risk.level} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase text-[#687384]">Allowed</p>
              <p className="mt-2 text-lg font-semibold text-[#172326]">
                {String(result.decision.allowed)}
              </p>
            </div>
            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase text-[#687384]">
                Requires approval
              </p>
              <p className="mt-2 text-lg font-semibold text-[#172326]">
                {String(result.decision.requiresApproval)}
              </p>
            </div>
            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase text-[#687384]">Risk score</p>
              <p className="mt-2 text-lg font-semibold text-[#172326]">
                {result.decision.risk.score}
              </p>
            </div>
            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase text-[#687384]">Status</p>
              <div className="mt-2">
                <StatusBadge status={result.decision.status} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-[#172326]">Ticket input</h3>
              <p className="mt-2 border border-[#d9dee8] bg-white p-4 text-sm leading-6 text-[#34404a]">
                {result.ticket.ticket}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#172326]">Reason</h3>
              <p className="mt-2 border border-[#d9dee8] bg-white p-4 text-sm leading-6 text-[#34404a]">
                {result.decision.reason}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#172326]">Risk signals</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.decision.risk.signals.map((signal) => (
                <Badge key={signal}>{signal}</Badge>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-[#5c6470]">
              {result.decision.risk.explanation}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-[#172326]">
                Agent intended action
              </h3>
              <div className="mt-2">
                <JsonViewer value={result.intendedAction} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#172326]">
                Transcript summary
              </h3>
              <div className="mt-2">
                <JsonViewer value={result.transcriptSummary} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-[#172326]">Payload</h3>
              <div className="mt-2">
                <JsonViewer value={intendedAction.payload ?? {}} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#172326]">Metadata</h3>
              <div className="mt-2">
                <JsonViewer value={intendedAction.metadata ?? {}} />
              </div>
            </div>
          </div>

          {result.executionResult ? (
            <div>
              <h3 className="text-sm font-semibold text-[#172326]">
                Execution result
              </h3>
              <p className="mt-2 text-sm text-[#5c6470]">
                Execution is simulated only. No real external tool was called.
              </p>
              <div className="mt-2">
                <JsonViewer value={result.executionResult} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 border border-[#d9dee8] bg-[#f8fafc] p-4 text-sm md:grid-cols-2">
            <p>
              <span className="font-semibold text-[#172326]">Action request ID:</span>{" "}
              <span className="font-mono text-xs">{result.decision.actionRequestId}</span>
            </p>
            <p>
              <span className="font-semibold text-[#172326]">Approval request ID:</span>{" "}
              <span className="font-mono text-xs">
                {result.decision.approvalRequestId ?? "none"}
              </span>
            </p>
            <p>
              <span className="font-semibold text-[#172326]">API key prefix:</span>{" "}
              <span className="font-mono text-xs">{result.keyPrefix}</span>
            </p>
            <p>
              <span className="font-semibold text-[#172326]">Mode:</span>{" "}
              {result.transcriptSummary.mode}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button href={result.links.action} variant="secondary">
              <ClipboardCheck className="h-4 w-4" aria-hidden />
              Open action
            </Button>
            {result.links.approval ? (
              <Button href={result.links.approval} variant="secondary">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Open approval
              </Button>
            ) : null}
            <Button href={result.links.auditLogs} variant="secondary">
              <FileClock className="h-4 w-4" aria-hidden />
              Audit logs
            </Button>
          </div>

          {result.decision.decision === "REQUIRE_APPROVAL" ? (
            <div className="border border-[#e6d1a7] bg-[#fff8e7] p-4 text-sm leading-6 text-[#5f4817]">
              <p className="font-semibold">Approval next step</p>
              <p className="mt-1">
                Approve this in the Approval Inbox, then rerun/resume from the CLI
                or future UI. Browser execution of approved actions is intentionally
                not implemented here.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function AgentLabClient({ scenarios }: { scenarios: Scenario[] }) {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentLabResult | null>(null);

  async function runScenario(scenario: string) {
    setActiveScenario(scenario);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/demo/support-agent/run", {
        body: JSON.stringify({ scenario }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json()) as {
        error?: string;
        result?: AgentLabResult;
      };

      if (!response.ok || !body.result) {
        throw new Error(body.error ?? "Agent Lab run failed.");
      }

      setResult(body.result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Agent Lab run failed.");
    } finally {
      setActiveScenario(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario) => (
          <Card key={scenario.name}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{formatLabel(scenario.name)}</CardTitle>
                  <p className="mt-2 text-sm text-[#5c6470]">{scenario.ticketId}</p>
                </div>
                <Badge tone="blue">{scenario.intendedTool}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm leading-6 text-[#34404a]">
                {scenario.ticketSummary}
              </p>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#687384]">Tool</dt>
                  <dd className="font-semibold text-[#172326]">
                    {scenario.intendedTool}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#687384]">Action</dt>
                  <dd className="font-semibold text-[#172326]">
                    {scenario.intendedAction}
                  </dd>
                </div>
              </dl>
              <div className="border border-[#d9dee8] bg-[#f8fafc] p-3 text-sm leading-6 text-[#34404a]">
                {scenario.expectedSafetyBehavior}
              </div>
              <Button
                disabled={activeScenario !== null}
                onClick={() => void runScenario(scenario.name)}
              >
                <Play className="h-4 w-4" aria-hidden />
                {activeScenario === scenario.name ? "Running..." : "Run scenario"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeScenario ? <LoadingPanel label="Running agent scenario" /> : null}

      {error ? (
        <div className="flex items-start gap-3 border border-[#e6c6b7] bg-[#fff4ef] p-4 text-sm text-[#9d3f1f]">
          <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden />
          <div>
            <p className="font-semibold">Agent Lab run failed</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      {result ? <ResultPanel result={result} /> : null}

      <p className="text-sm leading-6 text-[#5c6470]">
        Need to approve a request? Open the Approval Inbox from the result link
        or go to <Link className="font-semibold text-[#2d6f7f]" href="/approvals">Approvals</Link>.
      </p>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Cable, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { formatEnumLabel } from "@/lib/format";

type WebhookDemoCardProps = {
  canManage: boolean;
  config: {
    description: string;
    name: string;
  };
  examplePayload: unknown;
  status: string;
};

export function WebhookDemoCard({
  canManage,
  config,
  examplePayload,
  status,
}: WebhookDemoCardProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(config.name);
  const [description, setDescription] = useState(config.description);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function testWebhookDemo() {
    startTransition(async () => {
      setError(null);
      setResult(null);

      const response = await fetch("/api/integrations/webhook-demo/test", {
        body: JSON.stringify({ description, name }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Webhook demo test failed.");
        return;
      }

      setResult(JSON.stringify(body.result, null, 2));
    });
  }

  return (
    <Card className="md:col-span-2 xl:col-span-4">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-[#d9dee8] bg-[#f8fafc] text-[#2d6f7f]">
              <Cable className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <CardTitle>Webhook Demo</CardTitle>
              <p className="mt-1 text-sm text-[#5c6470]">
                Generic future-tool target for simulated V1 deliveries.
              </p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">Demo only</Badge>
              <Badge tone="slate">{formatEnumLabel("WEBHOOK")}</Badge>
              <Badge tone="amber">No external delivery</Badge>
            </div>

            <p className="text-sm leading-6 text-[#5c6470]">
              Configure a friendly demo name and description for audit and execution
              output. AgentGate V1 simulates delivery only and never calls external URLs.
            </p>

            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Demo webhook name
                <Input
                  disabled={!canManage || isPending}
                  onChange={(event) => setName(event.target.value)}
                  value={name}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Description
                <Textarea
                  disabled={!canManage || isPending}
                  onChange={(event) => setDescription(event.target.value)}
                  value={description}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={!canManage || isPending}
                  onClick={testWebhookDemo}
                  type="button"
                >
                  <Send className="h-4 w-4" aria-hidden />
                  {isPending ? "Testing..." : "Save and test demo"}
                </Button>
                {!canManage ? (
                  <span className="text-sm text-[#687384]">
                    Owner, security admin, or developer role required.
                  </span>
                ) : null}
              </div>
            </div>

            {error ? (
              <div className="border border-[#e6c6b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#9d3f1f]">
                {error}
              </div>
            ) : null}
            {result ? (
              <pre className="max-h-72 overflow-auto bg-[#111318] p-4 text-xs leading-6 text-[#d8eeee]">
                {result}
              </pre>
            ) : null}
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-semibold">Example gateway payload</p>
            <pre className="max-h-[34rem] overflow-auto bg-[#111318] p-4 text-xs leading-6 text-[#d8eeee]">
              {JSON.stringify(examplePayload, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { FilePlus2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEnumLabel } from "@/lib/format";
import type { PolicyTemplate } from "@/server/policies/templates";

export function PolicyTemplateCard({
  canManage,
  template,
}: {
  canManage: boolean;
  template: PolicyTemplate;
}) {
  const primaryRule = template.policy.rules[0];

  return (
    <article className="flex h-full flex-col justify-between border border-[#d9dee8] bg-white p-4 shadow-sm">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">{template.category}</Badge>
          <StatusBadge status={template.policy.status} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#172326]">
            {template.policy.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#5c6470]">
            {template.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={primaryRule.decision} />
          {primaryRule.requiredRole ? (
            <Badge>{formatEnumLabel(primaryRule.requiredRole)}</Badge>
          ) : null}
          {primaryRule.riskOverride ? (
            <Badge tone="amber">{formatEnumLabel(primaryRule.riskOverride)}</Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf1f6] pt-4">
        <p className="text-xs text-[#687384]">
          Priority {template.policy.priority} · {template.policy.rules.length} rule
        </p>
        {canManage ? (
          <Button
            className="h-9"
            href={`/policies/new?template=${encodeURIComponent(template.id)}`}
            variant="secondary"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden />
            Use
          </Button>
        ) : (
          <span className="text-xs font-semibold text-[#687384]">View only</span>
        )}
      </div>
    </article>
  );
}

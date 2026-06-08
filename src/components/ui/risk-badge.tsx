import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/format";

export function RiskBadge({ risk }: { risk: string }) {
  const normalized = risk.toUpperCase();
  const tone =
    normalized === "CRITICAL"
      ? "purple"
      : normalized === "HIGH"
        ? "red"
        : normalized === "MEDIUM"
          ? "amber"
          : normalized === "LOW"
            ? "green"
            : "slate";

  return <Badge tone={tone}>{formatEnumLabel(risk)}</Badge>;
}

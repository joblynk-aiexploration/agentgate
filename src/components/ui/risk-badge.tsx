import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/format";

export function RiskBadge({ risk }: { risk: string }) {
  const normalized = risk.toUpperCase();
  const tone =
    normalized === "CRITICAL"
      ? "red"
      : normalized === "HIGH"
        ? "amber"
      : normalized === "MEDIUM"
        ? "blue"
        : normalized === "LOW"
          ? "green"
          : "slate";

  return <Badge tone={tone}>{formatEnumLabel(risk)}</Badge>;
}

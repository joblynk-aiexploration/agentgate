import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/format";

export function RiskBadge({ risk }: { risk: string }) {
  const normalized = risk.toUpperCase();
  const tone =
    normalized === "CRITICAL" || normalized === "HIGH"
      ? "red"
      : normalized === "MEDIUM"
        ? "amber"
        : normalized === "LOW"
          ? "blue"
          : "slate";

  return <Badge tone={tone}>{formatEnumLabel(risk)}</Badge>;
}

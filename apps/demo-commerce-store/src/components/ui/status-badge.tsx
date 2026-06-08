import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized.includes("cancel") || normalized.includes("block")
      ? "danger"
      : normalized.includes("pending") || normalized.includes("processing")
        ? "warning"
        : normalized.includes("deliver") || normalized.includes("ship") || normalized.includes("active")
          ? "success"
          : "neutral";

  return <Badge tone={tone}>{titleCase(status)}</Badge>;
}

export const OrderStatusBadge = StatusBadge;

import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/format";

export function StatusBadge({ status }: { status: string | boolean }) {
  if (typeof status === "boolean") {
    return (
      <Badge tone={status ? "red" : "green"}>
        {status ? "Enabled" : "Disabled"}
      </Badge>
    );
  }

  const normalized = status.toUpperCase();
  const tone =
    normalized.includes("ACTIVE") ||
    normalized.includes("ALLOW") ||
    normalized.includes("APPROVED") ||
    normalized.includes("CONNECTED")
      ? "green"
      : normalized.includes("PENDING") ||
          normalized.includes("DRAFT") ||
          normalized.includes("TRIAL")
        ? "amber"
        : normalized.includes("BLOCK") ||
            normalized.includes("REJECT") ||
            normalized.includes("DISABLED") ||
            normalized.includes("ERROR") ||
            normalized.includes("SUSPENDED")
          ? "red"
          : "slate";

  return <Badge tone={tone}>{formatEnumLabel(status)}</Badge>;
}

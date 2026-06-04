import { format, formatDistanceToNow } from "date-fns";

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Never";
  }

  return format(new Date(value), "MMM d, yyyy");
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "Never";
  }

  return format(new Date(value), "MMM d, yyyy h:mm a");
}

export function formatRelativeTime(value: Date | string | null | undefined) {
  if (!value) {
    return "Never";
  }

  return `${formatDistanceToNow(new Date(value))} ago`;
}

export function formatCurrency(cents: number | null | undefined) {
  if (cents == null) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}

export function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function summarizeJson(value: unknown) {
  if (value == null) {
    return "No details";
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  const entries = Object.entries(value).slice(0, 3);

  if (entries.length === 0) {
    return "Empty object";
  }

  return entries
    .map(([key, entryValue]) => {
      if (entryValue == null) {
        return `${key}: null`;
      }

      if (typeof entryValue === "object") {
        return `${key}: ${Array.isArray(entryValue) ? "array" : "object"}`;
      }

      return `${key}: ${String(entryValue)}`;
    })
    .join(", ");
}

"use client";

export function CopyButton({ label = "Copy", value }: { label?: string; value: string }) {
  return (
    <button className="button secondary" type="button" onClick={() => navigator.clipboard.writeText(value)}>
      {label}
    </button>
  );
}

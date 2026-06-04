import { summarizeJson } from "@/lib/format";

export function JsonViewer({
  value,
  previewOnly = false,
}: {
  value: unknown;
  previewOnly?: boolean;
}) {
  if (previewOnly) {
    return <span>{summarizeJson(value)}</span>;
  }

  return (
    <pre className="max-h-80 overflow-auto bg-[#111318] p-4 text-xs leading-6 text-[#d8eeee]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

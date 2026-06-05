"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  label = "Copy",
  text,
}: {
  label?: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button onClick={copyText} type="button" variant="secondary">
      <Copy className="h-4 w-4" aria-hidden />
      {copied ? "Copied" : label}
    </Button>
  );
}

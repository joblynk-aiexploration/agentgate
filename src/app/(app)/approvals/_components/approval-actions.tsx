"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FilePenLine, Info, OctagonX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ApprovalActionsProps = {
  approvalId: string;
  canAct: boolean;
  initialEditedPayload: unknown;
  initialPayload: unknown;
  isPendingApproval: boolean;
};

export function ApprovalActions({
  approvalId,
  canAct,
  initialEditedPayload,
  initialPayload,
  isPendingApproval,
}: ApprovalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(initialEditedPayload ?? initialPayload ?? {}, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  function postAction(path: "approve" | "reject") {
    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/approvals/${approvalId}/${path}`, {
        body: JSON.stringify({ comment: comment || null }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Approval action failed.");
        return;
      }

      router.refresh();
    });
  }

  function editPayload() {
    startTransition(async () => {
      setError(null);

      let editedPayloadJson;

      try {
        editedPayloadJson = JSON.parse(payloadText || "{}");
      } catch {
        setError("Edited payload must be valid JSON.");
        return;
      }

      const response = await fetch(`/api/approvals/${approvalId}/edit`, {
        body: JSON.stringify({
          editedPayloadJson,
          comment: comment || null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Payload edit failed.");
        return;
      }

      router.refresh();
    });
  }

  const disabled = !canAct || !isPendingApproval || isPending;

  return (
    <div className="grid gap-5">
      {error ? (
        <div className="border border-[#e6c6b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#9d3f1f]">
          {error}
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium">
        Review comment
        <Textarea
          disabled={disabled}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add context for the audit trail."
          value={comment}
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Edited payload JSON
        <Textarea
          className="min-h-56 font-mono text-xs"
          disabled={disabled}
          onChange={(event) => setPayloadText(event.target.value)}
          spellCheck={false}
          value={payloadText}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={() => postAction("approve")} type="button">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Approve
        </Button>
        <Button
          disabled={disabled}
          onClick={() => postAction("reject")}
          type="button"
          variant="danger"
        >
          <OctagonX className="h-4 w-4" aria-hidden />
          Reject
        </Button>
        <Button disabled={disabled} onClick={editPayload} type="button" variant="secondary">
          <FilePenLine className="h-4 w-4" aria-hidden />
          Edit payload
        </Button>
        <Button disabled type="button" variant="secondary">
          <Info className="h-4 w-4" aria-hidden />
          Request more info
        </Button>
        <Button disabled type="button" variant="secondary">
          Cancel
        </Button>
      </div>

      {!canAct ? (
        <p className="text-sm text-[#687384]">
          Your current role can view this approval but cannot make a review decision.
        </p>
      ) : null}
      {!isPendingApproval ? (
        <p className="text-sm text-[#687384]">
          This approval request has already left the pending review state.
        </p>
      ) : null}
    </div>
  );
}

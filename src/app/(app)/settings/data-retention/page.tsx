import { revalidatePath } from "next/cache";
import { AlertTriangle, DatabaseZap, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  cleanupDataRetentionRecords,
  getDataRetentionDryRun,
  requireDataRetentionManager,
  updateDataRetentionSettings,
} from "@/lib/data-retention";
import { formatDateTime } from "@/lib/format";
import { dataRetentionSettingsSchema } from "@/lib/validators";

async function updateRetentionAction(formData: FormData) {
  "use server";

  const membership = await requireDataRetentionManager();
  const input = dataRetentionSettingsSchema.parse({
    auditLogRetentionDays: formData.get("auditLogRetentionDays"),
    actionRetentionDays: formData.get("actionRetentionDays"),
    approvalRetentionDays: formData.get("approvalRetentionDays"),
  });

  await updateDataRetentionSettings(membership, input);
}

async function dryRunCleanupAction() {
  "use server";

  const membership = await requireDataRetentionManager();

  await cleanupDataRetentionRecords(membership, {
    confirm: false,
  });
  revalidatePath("/settings/data-retention");
}

async function executeCleanupAction() {
  "use server";

  const membership = await requireDataRetentionManager();

  await cleanupDataRetentionRecords(membership, {
    confirm: true,
  });
}

export default async function DataRetentionPage() {
  const membership = await requireDataRetentionManager();
  const dryRun = await getDataRetentionDryRun(membership);
  const totalCleanupCandidates =
    dryRun.counts.auditLogs +
    dryRun.counts.actionRequests +
    dryRun.counts.approvalRequests;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Configure conservative V1 retention windows and inspect cleanup candidates before deleting old audit, action, or approval records."
        eyebrow={membership.organization.slug}
        title="Data Retention"
      />

      <Card className="border-[#e6d1a7]">
        <CardContent className="flex items-start gap-3 text-sm leading-6 text-[#34404a]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9d6b1f]" aria-hidden />
          <p>
            Export audit logs and reports before cleanup. V1 cleanup never
            deletes users, memberships, agents, policies, or API keys. It only
            considers organization-scoped audit logs, action requests, and
            approval requests older than the configured retention windows.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Audit log retention</p>
            <p className="mt-3 text-2xl font-semibold">
              {dryRun.settings.auditLogRetentionDays} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Action request retention</p>
            <p className="mt-3 text-2xl font-semibold">
              {dryRun.settings.actionRetentionDays} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Approval retention</p>
            <p className="mt-3 text-2xl font-semibold">
              {dryRun.settings.approvalRetentionDays} days
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retention settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateRetentionAction} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Audit log retention days
                <Input
                  defaultValue={dryRun.settings.auditLogRetentionDays}
                  min={30}
                  max={3650}
                  name="auditLogRetentionDays"
                  required
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Action request retention days
                <Input
                  defaultValue={dryRun.settings.actionRetentionDays}
                  min={30}
                  max={3650}
                  name="actionRetentionDays"
                  required
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Approval retention days
                <Input
                  defaultValue={dryRun.settings.approvalRetentionDays}
                  min={30}
                  max={3650}
                  name="approvalRetentionDays"
                  required
                  type="number"
                />
              </label>
            </div>
            <div className="flex justify-end border-t border-[#e5e9ef] pt-5">
              <Button type="submit">Save retention settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cleanup dry-run</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4">
              <p className="text-sm text-[#5c6470]">Old audit logs</p>
              <p className="mt-3 text-2xl font-semibold">{dryRun.counts.auditLogs}</p>
              <p className="mt-2 text-xs text-[#687384]">
                Older than {formatDateTime(dryRun.cutoffs.auditLogs)}
              </p>
            </div>
            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4">
              <p className="text-sm text-[#5c6470]">Old action requests</p>
              <p className="mt-3 text-2xl font-semibold">
                {dryRun.counts.actionRequests}
              </p>
              <p className="mt-2 text-xs text-[#687384]">
                Older than {formatDateTime(dryRun.cutoffs.actionRequests)}
              </p>
            </div>
            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4">
              <p className="text-sm text-[#5c6470]">Old approvals</p>
              <p className="mt-3 text-2xl font-semibold">
                {dryRun.counts.approvalRequests}
              </p>
              <p className="mt-2 text-xs text-[#687384]">
                Older than {formatDateTime(dryRun.cutoffs.approvalRequests)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#e5e9ef] pt-5">
            <form action={dryRunCleanupAction}>
              <Button type="submit" variant="secondary">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Run cleanup dry-run
              </Button>
            </form>
            <Button href="/api/audit-logs/export" variant="secondary">
              <Download className="h-4 w-4" aria-hidden />
              Export audit logs
            </Button>
            <form action={executeCleanupAction}>
              <Button
                disabled={totalCleanupCandidates === 0}
                type="submit"
                variant="danger"
              >
                <DatabaseZap className="h-4 w-4" aria-hidden />
                Execute safe cleanup
              </Button>
            </form>
          </div>
          <p className="text-sm leading-6 text-[#687384]">
            Cleanup execution is disabled unless the dry-run finds old records.
            Executed cleanup creates a fresh audit log after deletion.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

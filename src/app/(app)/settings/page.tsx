import { revalidatePath } from "next/cache";
import { AlertTriangle, Building2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canManageKillSwitch,
  canManageOrganizationSettings,
  requireSettingsViewer,
  setOrganizationKillSwitch,
  updateOrganizationSettings,
} from "@/lib/settings";
import { formatEnumLabel } from "@/lib/format";
import { settingsUpdateSchema } from "@/lib/validators";

async function updateSettingsAction(formData: FormData) {
  "use server";

  const membership = await requireSettingsViewer();
  const input = settingsUpdateSchema.parse({
    name: formData.get("name"),
    aiReviewerMode: formData.get("aiReviewerMode"),
  });

  await updateOrganizationSettings(membership, input);
  revalidatePath("/settings");
}

async function enableKillSwitchAction() {
  "use server";

  const membership = await requireSettingsViewer();

  await setOrganizationKillSwitch(membership, true);
}

async function disableKillSwitchAction() {
  "use server";

  const membership = await requireSettingsViewer();

  await setOrganizationKillSwitch(membership, false);
}

export default async function SettingsPage() {
  const membership = await requireSettingsViewer();
  const organization = membership.organization;
  const canManageOrg = canManageOrganizationSettings(membership.role);
  const canToggleKillSwitch = canManageKillSwitch(membership.role);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Manage the organization profile, local safety posture, and V1 kill switch."
        eyebrow={organization.slug}
        title="Settings"
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Plan</p>
            <p className="mt-3 font-semibold">{formatEnumLabel(organization.plan)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Organization status</p>
            <div className="mt-3">
              <StatusBadge status={organization.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Kill switch</p>
            <div className="mt-3">
              <StatusBadge status={organization.killSwitchEnabled} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">AI reviewer mode</p>
            <p className="mt-3 font-semibold">Local rules only</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateSettingsAction} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Organization name
                <Input
                  defaultValue={organization.name}
                  disabled={!canManageOrg}
                  name="name"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <Input disabled value={organization.slug} />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              AI Reviewer Mode
              <Select defaultValue="LOCAL_RULES_ONLY" disabled={!canManageOrg} name="aiReviewerMode">
                <option value="DISABLED">Disabled</option>
                <option value="LOCAL_RULES_ONLY">Local rules only</option>
                <option value="LOCAL_MODEL" disabled>
                  Local model
                </option>
                <option value="PREMIUM_MODEL" disabled>
                  Premium model
                </option>
              </Select>
            </label>

            <div className="flex items-center gap-3 border border-[#d9dee8] bg-[#f8fafc] p-4 text-sm text-[#34404a]">
              <Building2 className="h-4 w-4 shrink-0 text-[#2d6f7f]" aria-hidden />
              <p>AgentGate V1 uses deterministic local rules only and does not use paid AI APIs.</p>
            </div>

            {canManageOrg ? (
              <div className="flex justify-end border-t border-[#e5e9ef] pt-5">
                <Button type="submit">Save settings</Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="border-[#e6c6b7]">
        <CardHeader className="border-[#e6c6b7]">
          <CardTitle>Organization kill switch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 text-sm leading-6 text-[#5c6470]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9d3f1f]" aria-hidden />
            <p>
              When enabled, the gateway blocks incoming agent actions before policy approval.
              This is audited and reversible by authorized operators.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <form action={enableKillSwitchAction}>
              <Button
                disabled={!canToggleKillSwitch || organization.killSwitchEnabled}
                type="submit"
                variant="danger"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden />
                Enable kill switch
              </Button>
            </form>
            <form action={disableKillSwitchAction}>
              <Button
                disabled={!canToggleKillSwitch || !organization.killSwitchEnabled}
                type="submit"
                variant="secondary"
              >
                Disable kill switch
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

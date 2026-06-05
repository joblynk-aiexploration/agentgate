import { Check, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { rbacCapabilities, rbacRoles, hasCapability } from "@/lib/rbac";
import { requireSettingsViewer } from "@/lib/settings";
import { formatEnumLabel } from "@/lib/format";

export default async function AccessReviewPage() {
  const membership = await requireSettingsViewer();

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Review the V1 role-based access matrix used to explain organization permissions to operators and auditors."
        eyebrow={membership.organization.slug}
        title="Access Review"
      />

      <Card>
        <CardContent className="flex items-start gap-3 text-sm leading-6 text-[#34404a]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2d6f7f]" aria-hidden />
          <p>
            Client-side visibility is only for UX. Server-side checks remain the
            source of truth. Reviewer approval permissions are limited to assigned
            or role-eligible approvals, and platform owner is reserved as a
            placeholder role.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RBAC matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto border-t border-[#edf1f6]">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#e5e9ef] bg-[#f8fafc] text-xs uppercase text-[#687384]">
                  <th className="sticky left-0 z-10 bg-[#f8fafc] px-4 py-3 font-semibold">
                    Capability
                  </th>
                  {rbacRoles.map((role) => (
                    <th className="px-4 py-3 text-center font-semibold" key={role}>
                      {formatEnumLabel(role)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rbacCapabilities.map((capability) => (
                  <tr
                    className="border-b border-[#edf1f6] transition hover:bg-[#fbfcfe] last:border-0"
                    key={capability.id}
                  >
                    <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left align-top font-medium text-[#172326]">
                      <span className="block">{capability.label}</span>
                      <span className="mt-1 block max-w-sm text-xs font-normal leading-5 text-[#687384]">
                        {capability.description}
                      </span>
                    </th>
                    {rbacRoles.map((role) => {
                      const allowed = hasCapability(role, capability.id);

                      return (
                        <td className="px-4 py-3 text-center align-top" key={role}>
                          {allowed ? (
                            <Badge className="gap-1" tone="green">
                              <Check className="h-3.5 w-3.5" aria-hidden />
                              Yes
                            </Badge>
                          ) : (
                            <Badge className="gap-1" tone="slate">
                              <X className="h-3.5 w-3.5" aria-hidden />
                              No
                            </Badge>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

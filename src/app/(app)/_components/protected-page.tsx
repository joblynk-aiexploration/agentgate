import { requireMembership } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

type ProtectedPageProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export async function ProtectedPage({
  title,
  description,
  children,
}: ProtectedPageProps) {
  const membership = await requireMembership();

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        description={description}
        eyebrow={membership.organization.slug}
        title={title}
      />
      {children ?? (
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">
              This protected V1 workspace view is ready for the next feature pass.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
